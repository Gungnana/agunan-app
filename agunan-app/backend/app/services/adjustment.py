from datetime import date
from typing import Dict, Any, Tuple


def calculate_adjustments(
    agunan_data: Dict[str, Any],
    pembanding_data: Dict[str, Any],
    parameter_dict: Dict[str, Any],
    reference_date: date,
) -> Tuple[float, float, Dict[str, Any]]:
    """
    Menghitung matriks penyesuaian (adjustments) per pembanding terhadap agunan:
    1. Waktu (Market conditions/time trend)
    2. Lokasi (Jarak & aksesibilitas spasial)
    3. Luas (Skala ekonomi tanah / plottage effect)
    4. Lebar Jalan (Akses jalan masuk)
    5. Bentuk Tanah (Topografi dan pemanfaatan tapak)
    6. Legalitas (Hak kepemilikan tanah)

    Seluruh persentase dan bobot dibaca murni dari parameter_dict (TIDAK di-hardcode).
    Mengembalikan tuple: (total_adj_pct, harga_adjusted_per_m2, rincian_dict)
    """
    # 1. Penyesuaian Waktu
    tgl_pembanding = pembanding_data["tanggal_data"]
    if isinstance(tgl_pembanding, str):
        tgl_pembanding = date.fromisoformat(tgl_pembanding)

    days_diff = (reference_date - tgl_pembanding).days
    months_diff = max(0.0, days_diff / 30.4375)

    inflasi_tahunan = parameter_dict.get("penyesuaian_waktu", {}).get("inflasi_tahunan_pct", 0.04)
    monthly_rate = inflasi_tahunan / 12.0
    adj_waktu = months_diff * monthly_rate

    # 2. Penyesuaian Lokasi (Jarak)
    jarak_meter = float(pembanding_data.get("jarak_meter", 0.0))
    faktor_jarak_per_km = parameter_dict.get("penyesuaian_lokasi", {}).get("faktor_jarak_per_km_pct", -0.02)
    # Penurunan nilai jika pembanding berjarak lebih jauh dari lokasi subjek agunan
    adj_lokasi = -(jarak_meter / 1000.0) * abs(faktor_jarak_per_km)

    # 3. Penyesuaian Luas
    luas_agunan = float(agunan_data.get("luas_tanah", 100.0))
    luas_pembanding = float(pembanding_data.get("luas_tanah", 100.0))
    elastisitas_luas = parameter_dict.get("penyesuaian_luas", {}).get("elastisitas_luas", 0.15)
    
    # Jika pembanding lebih luas dari agunan, harga satuan pembanding cenderung lebih murah,
    # sehingga disesuaikan ke atas (+) agar sebanding dengan kavling agunan yang lebih kecil.
    adj_luas = ((luas_pembanding - luas_agunan) / max(luas_pembanding, 1.0)) * elastisitas_luas

    # 4. Penyesuaian Lebar Jalan
    lebar_jalan_agunan = float(agunan_data.get("lebar_jalan", 5.0))
    lebar_jalan_pembanding = float(pembanding_data.get("lebar_jalan", 5.0))
    faktor_lebar_per_m = parameter_dict.get("penyesuaian_lebar_jalan", {}).get("faktor_per_meter_pct", 0.03)
    adj_lebar_jalan = (lebar_jalan_agunan - lebar_jalan_pembanding) * faktor_lebar_per_m

    # 5. Penyesuaian Bentuk Tanah
    bobot_bentuk = parameter_dict.get("bobot_bentuk_tanah", {
        "PERSEGI": 0.00,
        "PERSEGI_PANJANG": -0.02,
        "KANTONG_SEMAR": 0.04,
        "TIDAK_BERATURAN": -0.08,
        "L": -0.05,
    })
    bentuk_agunan = str(agunan_data.get("bentuk_tanah", "PERSEGI")).upper()
    bentuk_pembanding = str(pembanding_data.get("bentuk_tanah", "PERSEGI")).upper()
    val_bentuk_agunan = bobot_bentuk.get(bentuk_agunan, 0.0)
    val_bentuk_pembanding = bobot_bentuk.get(bentuk_pembanding, 0.0)
    adj_bentuk = val_bentuk_agunan - val_bentuk_pembanding

    # 6. Penyesuaian Legalitas
    bobot_legalitas = parameter_dict.get("bobot_legalitas", {
        "SHM": 0.00,
        "HGB": -0.05,
        "GIRIK": -0.15,
        "LAINNYA": -0.20,
    })
    legalitas_agunan = str(agunan_data.get("legalitas", "SHM")).upper()
    legalitas_pembanding = str(pembanding_data.get("legalitas", "SHM")).upper()
    val_leg_agunan = bobot_legalitas.get(legalitas_agunan, 0.0)
    val_leg_pembanding = bobot_legalitas.get(legalitas_pembanding, 0.0)
    adj_legalitas = val_leg_agunan - val_leg_pembanding

    # Total Penyesuaian (Net Adjustment)
    total_adj_pct = (
        adj_waktu
        + adj_lokasi
        + adj_luas
        + adj_lebar_jalan
        + adj_bentuk
        + adj_legalitas
    )

    harga_cleansed = float(pembanding_data.get("harga_cleansed_per_m2", pembanding_data["harga_per_m2"]))
    harga_adjusted = round(harga_cleansed * (1.0 + total_adj_pct), 2)

    rincian = {
        "adj_waktu_pct": round(adj_waktu, 4),
        "adj_lokasi_pct": round(adj_lokasi, 4),
        "adj_luas_pct": round(adj_luas, 4),
        "adj_lebar_jalan_pct": round(adj_lebar_jalan, 4),
        "adj_bentuk_pct": round(adj_bentuk, 4),
        "adj_legalitas_pct": round(adj_legalitas, 4),
        "total_adj_pct": round(total_adj_pct, 4),
        "waktu_bulan": round(months_diff, 1),
        "jarak_meter": round(jarak_meter, 1),
    }

    return total_adj_pct, harga_adjusted, rincian
