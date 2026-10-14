from datetime import date
from typing import List, Dict, Any, Optional, Tuple
import math
from app.services.geo import validate_indonesia_coordinates
from app.services.cleansing import cleanse_candidates
from app.services.adjustment import calculate_adjustments
from app.services.scoring import calculate_similarity_score

ENGINE_ALGORITHM_VERSION = "v1.2.0-SPI-2026"


def calculate_coefficient_of_variation(prices: List[float]) -> Tuple[float, float, float]:
    """
    Menghitung rata-rata, deviasi standar sampel, dan Koefisien Variasi (CV) dalam persen.
    """
    if not prices:
        return 0.0, 0.0, 0.0

    n = len(prices)
    mean = sum(prices) / n
    if n < 2 or mean == 0:
        return mean, 0.0, 0.0

    variance = sum((x - mean) ** 2 for x in prices) / (n - 1)
    std_dev = math.sqrt(variance)
    cv_pct = (std_dev / mean) * 100.0
    return mean, std_dev, cv_pct


def compute_confidence_score(
    candidate_count: int,
    effective_radius_meters: int,
    cv_pct: float,
) -> float:
    """
    Menghitung Confidence Score (0 - 100) berdasarkan 3 pilar:
    1. Jumlah data pembanding (Bobot 30%)
    2. Radius jarak efektif pencarian (Bobot 30%)
    3. Koefisien Variasi (CV) homogenitas harga adjusted (Bobot 40%)
    """
    # 1. Komponen Jumlah Data
    if candidate_count >= 3:
        score_count = 100.0
    elif candidate_count == 2:
        score_count = 70.0
    else:
        score_count = 0.0

    # 2. Komponen Radius
    if effective_radius_meters <= 500:
        score_radius = 100.0
    elif effective_radius_meters <= 1000:
        score_radius = 85.0
    elif effective_radius_meters <= 2000:
        score_radius = 70.0
    elif effective_radius_meters <= 5000:
        score_radius = 50.0
    else:
        score_radius = 30.0

    # 3. Komponen Koefisien Variasi (CV)
    # Semakin kecil sebaran harga, semakin seragam pasar dan semakin tinggi reliabilitasnya
    score_cv = max(0.0, min(100.0, 100.0 - (cv_pct * 2.5)))

    final_confidence = (0.30 * score_count) + (0.30 * score_radius) + (0.40 * score_cv)
    return round(final_confidence, 1)


class ValuationEngine:
    """
    Mesin Valuasi Tanah Berbasis Data Pasar murni (Standar Penilaian Indonesia).
    Dapat diuji secara unit tanpa ketergantungan HTTP atau sesi database.
    """

    @classmethod
    def run_valuation_pipeline(
        cls,
        agunan_data: Dict[str, Any],
        raw_candidates: List[Dict[str, Any]],
        parameter_dict: Dict[str, Any],
        effective_radius_meters: int,
        reference_date: Optional[date] = None,
        override_pembanding_ids: Optional[List[int]] = None,
        override_reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Menjalankan alur lengkap valuasi:
        1. Validasi koordinat teritorial Indonesia
        2. Pembersihan data (Cleansing & normalisasi diskon penawaran, filter IQR)
        3. Penyesuaian nilai per pembanding (Waktu, Lokasi, Luas, Lebar Jalan, Bentuk, Legalitas)
        4. Scoring kemiripan & pembobotan sumber data
        5. Pemilihan top 2-3 pembanding (atau manual override)
        6. Perhitungan nilai pasar tertimbang, rentang nilai, nilai likuidasi, dan confidence score
        7. Pembuatan snapshot lengkap
        """
        if reference_date is None:
            reference_date = date.today()

        lat = float(agunan_data["lat"])
        lon = float(agunan_data["lon"])
        luas_agunan = float(agunan_data["luas_tanah"])

        # 1. Validasi Koordinat Indonesia
        is_valid_coord, coord_err = validate_indonesia_coordinates(lat, lon)
        if not is_valid_coord:
            return {
                "status": "ERROR_VALIDASI",
                "pesan": coord_err,
                "versi_algoritma": ENGINE_ALGORITHM_VERSION,
            }

        # 2. Cleansing Data
        diskon_penawaran = parameter_dict.get("diskon_penawaran_pct", 0.08)
        clean_candidates, outliers = cleanse_candidates(raw_candidates, diskon_penawaran)

        if not clean_candidates:
            return {
                "status": "DATA_TIDAK_CUKUP",
                "pesan": "Tidak ditemukan data pembanding yang memenuhi kriteria di sekitar lokasi agunan.",
                "versi_algoritma": ENGINE_ALGORITHM_VERSION,
                "jumlah_kandidat": len(raw_candidates),
                "jumlah_pembanding_dipakai": 0,
            }

        # 3 & 4. Perhitungan Penyesuaian dan Scoring untuk seluruh kandidat bersih
        processed_candidates = []
        for cand in clean_candidates:
            total_adj_pct, harga_adjusted, rincian_adj = calculate_adjustments(
                agunan_data=agunan_data,
                pembanding_data=cand,
                parameter_dict=parameter_dict,
                reference_date=reference_date,
            )

            skor_kemiripan, bobot_sumber, skor_akhir, rincian_skor = calculate_similarity_score(
                agunan_data=agunan_data,
                pembanding_data=cand,
                parameter_dict=parameter_dict,
                reference_date=reference_date,
            )

            processed_item = {
                **cand,
                "total_penyesuaian_pct": total_adj_pct,
                "harga_adjusted_per_m2": harga_adjusted,
                "rincian_penyesuaian": rincian_adj,
                "skor_kemiripan": skor_kemiripan,
                "bobot_sumber": bobot_sumber,
                "skor_akhir": skor_akhir,
                "rincian_skor": rincian_skor,
                "is_override": False,
                "alasan_override": None,
            }
            processed_candidates.append(processed_item)

        # 5. Seleksi Pembanding Terbaik (Otomatis vs Override)
        selected_candidates: List[Dict[str, Any]] = []

        if override_pembanding_ids:
            # Mode Override oleh Analis
            cand_by_id = {c["id"]: c for c in processed_candidates}
            for cid in override_pembanding_ids:
                if cid in cand_by_id:
                    item_copy = dict(cand_by_id[cid])
                    item_copy["is_override"] = True
                    item_copy["alasan_override"] = override_reason
                    selected_candidates.append(item_copy)
            status_valuasi = "OVERRIDDEN"
        else:
            # Mode Otomatis: Urutkan skor akhir tertinggi, ambil top 3
            processed_candidates.sort(key=lambda x: x["skor_akhir"], reverse=True)
            top_candidates = processed_candidates[:3]
            selected_candidates = top_candidates
            status_valuasi = "COMPLETED"

        # Validasi batas minimal pembanding (minimum 2)
        if len(selected_candidates) < 2:
            return {
                "status": "DATA_TIDAK_CUKUP",
                "pesan": f"Data pembanding yang memenuhi syarat hanya {len(selected_candidates)} (minimal 2 pembanding).",
                "versi_algoritma": ENGINE_ALGORITHM_VERSION,
                "jumlah_kandidat": len(raw_candidates),
                "jumlah_pembanding_dipakai": len(selected_candidates),
                "kandidat_tersedia": processed_candidates,
            }

        # 6. Perhitungan Nilai Pasar Tertimbang
        sum_scores = sum(c["skor_akhir"] for c in selected_candidates)
        if sum_scores <= 0:
            sum_scores = 1.0

        for idx, c in enumerate(selected_candidates):
            c["bobot_kontribusi"] = round(c["skor_akhir"] / sum_scores, 4)
            c["urutan"] = idx + 1

        estimasi_per_m2 = sum(c["bobot_kontribusi"] * c["harga_adjusted_per_m2"] for c in selected_candidates)
        estimasi_per_m2 = round(estimasi_per_m2, 2)

        nilai_pasar = round(estimasi_per_m2 * luas_agunan)

        adjusted_prices = [c["harga_adjusted_per_m2"] for c in selected_candidates]
        rentang_min = round(min(adjusted_prices) * luas_agunan)
        rentang_max = round(max(adjusted_prices) * luas_agunan)

        # Nilai Likuidasi
        haircut_likuidasi_pct = parameter_dict.get("haircut_likuidasi_pct", 0.30)
        nilai_likuidasi = round(nilai_pasar * (1.0 - haircut_likuidasi_pct))

        # Confidence Score & Koefisien Variasi
        mean_price, std_dev, cv_pct = calculate_coefficient_of_variation(adjusted_prices)
        confidence_score = compute_confidence_score(
            candidate_count=len(selected_candidates),
            effective_radius_meters=effective_radius_meters,
            cv_pct=cv_pct,
        )

        # 7. Snapshot Lengkap untuk Audit Ulang
        snapshot = {
            "versi_algoritma": ENGINE_ALGORITHM_VERSION,
            "tanggal_kalkulasi": reference_date.isoformat(),
            "agunan": agunan_data,
            "parameter_digunakan": parameter_dict,
            "effective_radius_meters": effective_radius_meters,
            "jumlah_kandidat_awal": len(raw_candidates),
            "jumlah_kandidat_bersih": len(clean_candidates),
            "jumlah_outlier": len(outliers),
            "outliers": outliers,
            "selected_pembanding": selected_candidates,
            "semua_kandidat_terproses": processed_candidates,
            "statistik": {
                "mean_adjusted_per_m2": round(mean_price, 2),
                "std_dev": round(std_dev, 2),
                "cv_persen": round(cv_pct, 2),
                "confidence_score": confidence_score,
            },
        }

        return {
            "status": status_valuasi,
            "estimasi_per_m2": estimasi_per_m2,
            "nilai_pasar": nilai_pasar,
            "rentang_min": rentang_min,
            "rentang_max": rentang_max,
            "nilai_likuidasi": nilai_likuidasi,
            "haircut_persen": round(haircut_likuidasi_pct * 100.0, 1),
            "confidence_score": confidence_score,
            "koefisien_variasi_pct": round(cv_pct, 2),
            "radius_efektif_meter": effective_radius_meters,
            "jumlah_kandidat": len(raw_candidates),
            "jumlah_pembanding_dipakai": len(selected_candidates),
            "versi_algoritma": ENGINE_ALGORITHM_VERSION,
            "selected_pembanding": selected_candidates,
            "kandidat_lain": [c for c in processed_candidates if c["id"] not in [s["id"] for s in selected_candidates]],
            "snapshot_json": snapshot,
        }
