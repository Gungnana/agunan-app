from datetime import date
from typing import Dict, Any, Tuple


def calculate_similarity_score(
    agunan_data: Dict[str, Any],
    pembanding_data: Dict[str, Any],
    parameter_dict: Dict[str, Any],
    reference_date: date,
) -> Tuple[float, float, float, Dict[str, float]]:
    """
    Menghitung skor kemiripan multi-kriteria (0 - 100) dan mengalikannya dengan bobot sumber data:
    - Jarak (jarak fisik)
    - Luas tanah (kemiripan ukuran)
    - Kesegaran data (usia data)
    - Kesetaraan legalitas
    - Kemiripan lebar jalan
    
    Bobot sumber data:
    - LELANG: 1.0
    - APPRAISAL_KJPP: 0.9
    - APPRAISAL_INTERNAL: 0.8
    - SURVEI: 0.7
    - LISTING: 0.4

    Mengembalikan tuple: (skor_kemiripan, bobot_sumber, skor_akhir, rincian_skor)
    """
    # 1. Skor Jarak (0 - 100)
    jarak_meter = float(pembanding_data.get("jarak_meter", 0.0))
    skor_jarak = max(0.0, 100.0 - (jarak_meter / 50.0))

    # 2. Skor Luas (0 - 100)
    luas_agunan = float(agunan_data.get("luas_tanah", 100.0))
    luas_pembanding = float(pembanding_data.get("luas_tanah", 100.0))
    max_luas = max(luas_agunan, luas_pembanding, 1.0)
    diff_luas_ratio = abs(luas_pembanding - luas_agunan) / max_luas
    skor_luas = max(0.0, 100.0 * (1.0 - diff_luas_ratio))

    # 3. Skor Kesegaran Data (0 - 100)
    tgl_pembanding = pembanding_data["tanggal_data"]
    if isinstance(tgl_pembanding, str):
        tgl_pembanding = date.fromisoformat(tgl_pembanding)
    age_days = max(0, (reference_date - tgl_pembanding).days)
    skor_waktu = max(0.0, 100.0 * (1.0 - min(age_days, 365) / 365.0))

    # 4. Skor Legalitas (0 - 100)
    leg_agunan = str(agunan_data.get("legalitas", "SHM")).upper()
    leg_pembanding = str(pembanding_data.get("legalitas", "SHM")).upper()
    if leg_agunan == leg_pembanding:
        skor_legalitas = 100.0
    elif (leg_agunan, leg_pembanding) in [("SHM", "HGB"), ("HGB", "SHM")]:
        skor_legalitas = 85.0
    elif "GIRIK" in (leg_agunan, leg_pembanding):
        skor_legalitas = 60.0
    else:
        skor_legalitas = 50.0

    # 5. Skor Lebar Jalan (0 - 100)
    lebar_jalan_agunan = float(agunan_data.get("lebar_jalan", 5.0))
    lebar_jalan_pembanding = float(pembanding_data.get("lebar_jalan", 5.0))
    skor_lebar_jalan = max(0.0, 100.0 - (abs(lebar_jalan_pembanding - lebar_jalan_agunan) * 15.0))

    # Bobot Kriteria
    kriteria_weights = parameter_dict.get("bobot_kriteria_skor", {
        "jarak": 0.30,
        "luas": 0.25,
        "waktu": 0.20,
        "legalitas": 0.15,
        "lebar_jalan": 0.10,
    })

    w_jarak = kriteria_weights.get("jarak", 0.30)
    w_luas = kriteria_weights.get("luas", 0.25)
    w_waktu = kriteria_weights.get("waktu", 0.20)
    w_leg = kriteria_weights.get("legalitas", 0.15)
    w_jalan = kriteria_weights.get("lebar_jalan", 0.10)

    skor_kemiripan = (
        (skor_jarak * w_jarak)
        + (skor_luas * w_luas)
        + (skor_waktu * w_waktu)
        + (skor_legalitas * w_leg)
        + (skor_lebar_jalan * w_jalan)
    )

    # Bobot Sumber Data
    bobot_sumber_dict = parameter_dict.get("bobot_sumber_data", {
        "LELANG": 1.0,
        "APPRAISAL_KJPP": 0.9,
        "APPRAISAL_INTERNAL": 0.8,
        "SURVEI": 0.7,
        "LISTING": 0.4,
    })
    sumber = str(pembanding_data.get("sumber", "SURVEI")).upper()
    bobot_sumber = float(bobot_sumber_dict.get(sumber, 0.7))

    # Skor Akhir
    skor_akhir = round(skor_kemiripan * bobot_sumber, 2)

    rincian_skor = {
        "skor_jarak": round(skor_jarak, 2),
        "skor_luas": round(skor_luas, 2),
        "skor_waktu": round(skor_waktu, 2),
        "skor_legalitas": round(skor_legalitas, 2),
        "skor_lebar_jalan": round(skor_lebar_jalan, 2),
    }

    return round(skor_kemiripan, 2), bobot_sumber, skor_akhir, rincian_skor
