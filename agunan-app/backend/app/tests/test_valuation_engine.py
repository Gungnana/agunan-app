from datetime import date, timedelta
from app.services.valuation_engine import (
    ValuationEngine,
    calculate_coefficient_of_variation,
    compute_confidence_score,
)


def test_calculate_coefficient_of_variation():
    prices = [10000000.0, 10000000.0, 10000000.0]
    mean, std_dev, cv = calculate_coefficient_of_variation(prices)
    assert mean == 10000000.0
    assert std_dev == 0.0
    assert cv == 0.0

    prices_varied = [10000000.0, 12000000.0]
    mean, std_dev, cv = calculate_coefficient_of_variation(prices_varied)
    assert mean == 11000000.0
    assert cv > 0


def test_valuation_engine_pipeline():
    ref_date = date(2026, 10, 1)

    agunan_data = {
        "id": 1,
        "kode_agunan": "AGN-TEST-001",
        "lat": -6.2383,
        "lon": 106.8528,
        "luas_tanah": 200.0,
        "legalitas": "SHM",
        "lebar_jalan": 6.0,
        "bentuk_tanah": "PERSEGI",
        "jenis_properti": "TANAH",
        "alamat": "Jl. Tebet",
        "kota_kabupaten": "Jakarta Selatan",
        "provinsi": "DKI Jakarta",
    }

    raw_candidates = [
        {
            "id": 101,
            "kode_referensi": "CMP-101",
            "sumber": "APPRAISAL_KJPP",
            "jenis_harga": "NILAI_PASAR",
            "lat": -6.2390,
            "lon": 106.8530,
            "jarak_meter": 80.0,
            "luas_tanah": 200.0,
            "harga_per_m2": 15000000.0,
            "tanggal_data": ref_date - timedelta(days=30),
            "legalitas": "SHM",
            "lebar_jalan": 6.0,
            "bentuk_tanah": "PERSEGI",
        },
        {
            "id": 102,
            "kode_referensi": "CMP-102",
            "sumber": "APPRAISAL_INTERNAL",
            "jenis_harga": "TRANSAKSI",
            "lat": -6.2370,
            "lon": 106.8520,
            "jarak_meter": 150.0,
            "luas_tanah": 220.0,
            "harga_per_m2": 15200000.0,
            "tanggal_data": ref_date - timedelta(days=60),
            "legalitas": "SHM",
            "lebar_jalan": 6.0,
            "bentuk_tanah": "PERSEGI",
        },
        {
            "id": 103,
            "kode_referensi": "CMP-103",
            "sumber": "SURVEI",
            "jenis_harga": "TRANSAKSI",
            "lat": -6.2410,
            "lon": 106.8540,
            "jarak_meter": 320.0,
            "luas_tanah": 190.0,
            "harga_per_m2": 14800000.0,
            "tanggal_data": ref_date - timedelta(days=90),
            "legalitas": "SHM",
            "lebar_jalan": 6.0,
            "bentuk_tanah": "PERSEGI",
        },
    ]

    parameter_dict = {
        "diskon_penawaran_pct": 0.08,
        "haircut_likuidasi_pct": 0.30,
        "penyesuaian_waktu": {"inflasi_tahunan_pct": 0.04},
        "penyesuaian_lokasi": {"faktor_jarak_per_km_pct": -0.02},
        "penyesuaian_luas": {"elastisitas_luas": 0.15},
        "penyesuaian_lebar_jalan": {"faktor_per_meter_pct": 0.03},
        "bobot_bentuk_tanah": {"PERSEGI": 0.0},
        "bobot_legalitas": {"SHM": 0.0},
        "bobot_sumber_data": {"APPRAISAL_KJPP": 0.9, "APPRAISAL_INTERNAL": 0.8, "SURVEI": 0.7},
        "bobot_kriteria_skor": {"jarak": 0.30, "luas": 0.25, "waktu": 0.20, "legalitas": 0.15, "lebar_jalan": 0.10},
    }

    result = ValuationEngine.run_valuation_pipeline(
        agunan_data=agunan_data,
        raw_candidates=raw_candidates,
        parameter_dict=parameter_dict,
        effective_radius_meters=500,
        reference_date=ref_date,
    )

    assert result["status"] == "COMPLETED"
    assert result["nilai_pasar"] > 0
    assert result["nilai_likuidasi"] == round(result["nilai_pasar"] * 0.70)
    assert result["confidence_score"] > 60
    assert len(result["selected_pembanding"]) == 3
    assert "snapshot_json" in result


def test_valuation_engine_data_tidak_cukup():
    ref_date = date(2026, 10, 1)

    agunan_data = {
        "lat": -6.2383,
        "lon": 106.8528,
        "luas_tanah": 200.0,
        "lebar_jalan": 6.0,
        "legalitas": "SHM",
        "bentuk_tanah": "PERSEGI",
    }

    # Hanya 1 pembanding (< 2)
    raw_candidates = [
        {
            "id": 101,
            "kode_referensi": "CMP-101",
            "sumber": "APPRAISAL_KJPP",
            "jenis_harga": "NILAI_PASAR",
            "lat": -6.2390,
            "lon": 106.8530,
            "jarak_meter": 80.0,
            "luas_tanah": 200.0,
            "harga_per_m2": 15000000.0,
            "tanggal_data": ref_date,
            "legalitas": "SHM",
            "lebar_jalan": 6.0,
            "bentuk_tanah": "PERSEGI",
        }
    ]

    result = ValuationEngine.run_valuation_pipeline(
        agunan_data=agunan_data,
        raw_candidates=raw_candidates,
        parameter_dict={},
        effective_radius_meters=500,
        reference_date=ref_date,
    )

    assert result["status"] == "DATA_TIDAK_CUKUP"
    assert "hanya 1" in result["pesan"]
