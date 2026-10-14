from datetime import date, timedelta
from app.services.adjustment import calculate_adjustments


def test_calculate_adjustments_basic():
    reference_date = date(2026, 10, 1)

    agunan_data = {
        "luas_tanah": 200.0,
        "lebar_jalan": 6.0,
        "bentuk_tanah": "PERSEGI",
        "legalitas": "SHM",
    }

    # Pembanding sama persis dengan agunan, tanggal sama, jarak 0
    pembanding_identik = {
        "tanggal_data": reference_date,
        "jarak_meter": 0.0,
        "luas_tanah": 200.0,
        "lebar_jalan": 6.0,
        "bentuk_tanah": "PERSEGI",
        "legalitas": "SHM",
        "harga_cleansed_per_m2": 10000000.0,
        "harga_per_m2": 10000000.0,
    }

    parameter_dict = {
        "penyesuaian_waktu": {"inflasi_tahunan_pct": 0.04},
        "penyesuaian_lokasi": {"faktor_jarak_per_km_pct": -0.02},
        "penyesuaian_luas": {"elastisitas_luas": 0.15},
        "penyesuaian_lebar_jalan": {"faktor_per_meter_pct": 0.03},
        "bobot_bentuk_tanah": {"PERSEGI": 0.0, "PERSEGI_PANJANG": -0.02, "TIDAK_BERATURAN": -0.08},
        "bobot_legalitas": {"SHM": 0.0, "HGB": -0.05, "GIRIK": -0.15},
    }

    total_adj, harga_adj, rincian = calculate_adjustments(
        agunan_data, pembanding_identik, parameter_dict, reference_date
    )

    assert total_adj == 0.0
    assert harga_adj == 10000000.0
    assert rincian["adj_waktu_pct"] == 0.0
    assert rincian["adj_lokasi_pct"] == 0.0
    assert rincian["adj_luas_pct"] == 0.0


def test_calculate_adjustments_with_variance():
    reference_date = date(2026, 10, 1)

    agunan_data = {
        "luas_tanah": 200.0,
        "lebar_jalan": 6.0,
        "bentuk_tanah": "PERSEGI",
        "legalitas": "SHM",
    }

    # Pembanding:
    # - Waktu: 6 bulan lalu (~180 hari) => inflasi waktu ~ +2%
    # - Jarak: 1000 meter => lokasi -2%
    # - Luas: 300 m2 (pembanding lebih besar) => adj_luas +
    # - Lebar jalan: 4m (agunan 6m vs pembanding 4m) => agunan lebih bagus (+6%)
    # - Bentuk tanah: TIDAK_BERATURAN (-0.08 vs 0.0) => +8%
    # - Legalitas: HGB (-0.05 vs 0.0) => +5%
    pembanding = {
        "tanggal_data": reference_date - timedelta(days=182),
        "jarak_meter": 1000.0,
        "luas_tanah": 300.0,
        "lebar_jalan": 4.0,
        "bentuk_tanah": "TIDAK_BERATURAN",
        "legalitas": "HGB",
        "harga_cleansed_per_m2": 10000000.0,
        "harga_per_m2": 10000000.0,
    }

    parameter_dict = {
        "penyesuaian_waktu": {"inflasi_tahunan_pct": 0.04},
        "penyesuaian_lokasi": {"faktor_jarak_per_km_pct": -0.02},
        "penyesuaian_luas": {"elastisitas_luas": 0.15},
        "penyesuaian_lebar_jalan": {"faktor_per_meter_pct": 0.03},
        "bobot_bentuk_tanah": {"PERSEGI": 0.0, "TIDAK_BERATURAN": -0.08},
        "bobot_legalitas": {"SHM": 0.0, "HGB": -0.05},
    }

    total_adj, harga_adj, rincian = calculate_adjustments(
        agunan_data, pembanding, parameter_dict, reference_date
    )

    assert rincian["adj_lebar_jalan_pct"] == 0.06  # (6 - 4) * 0.03
    assert rincian["adj_bentuk_pct"] == 0.08  # 0.0 - (-0.08)
    assert rincian["adj_legalitas_pct"] == 0.05  # 0.0 - (-0.05)
    assert rincian["adj_lokasi_pct"] == -0.02  # -1.0 * 0.02
    assert total_adj > 0
    assert harga_adj > 10000000.0
