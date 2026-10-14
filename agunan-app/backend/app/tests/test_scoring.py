from datetime import date
from app.services.scoring import calculate_similarity_score


def test_calculate_similarity_score():
    reference_date = date(2026, 10, 1)

    agunan_data = {
        "luas_tanah": 200.0,
        "lebar_jalan": 6.0,
        "legalitas": "SHM",
    }

    pembanding_identik = {
        "sumber": "LELANG",
        "jarak_meter": 0.0,
        "luas_tanah": 200.0,
        "lebar_jalan": 6.0,
        "legalitas": "SHM",
        "tanggal_data": reference_date,
    }

    parameter_dict = {
        "bobot_kriteria_skor": {
            "jarak": 0.30,
            "luas": 0.25,
            "waktu": 0.20,
            "legalitas": 0.15,
            "lebar_jalan": 0.10,
        },
        "bobot_sumber_data": {
            "LELANG": 1.0,
            "APPRAISAL_KJPP": 0.9,
            "APPRAISAL_INTERNAL": 0.8,
            "SURVEI": 0.7,
            "LISTING": 0.4,
        },
    }

    skor_kemiripan, bobot_sumber, skor_akhir, rincian = calculate_similarity_score(
        agunan_data, pembanding_identik, parameter_dict, reference_date
    )

    assert skor_kemiripan == 100.0
    assert bobot_sumber == 1.0
    assert skor_akhir == 100.0
    assert rincian["skor_jarak"] == 100.0
    assert rincian["skor_luas"] == 100.0
    assert rincian["skor_waktu"] == 100.0


def test_calculate_similarity_score_listing_penalty():
    reference_date = date(2026, 10, 1)

    agunan_data = {
        "luas_tanah": 200.0,
        "lebar_jalan": 6.0,
        "legalitas": "SHM",
    }

    pembanding_listing = {
        "sumber": "LISTING",
        "jarak_meter": 0.0,
        "luas_tanah": 200.0,
        "lebar_jalan": 6.0,
        "legalitas": "SHM",
        "tanggal_data": reference_date,
    }

    parameter_dict = {
        "bobot_sumber_data": {
            "LISTING": 0.4,
        },
    }

    skor_kemiripan, bobot_sumber, skor_akhir, _ = calculate_similarity_score(
        agunan_data, pembanding_listing, parameter_dict, reference_date
    )

    assert skor_kemiripan == 100.0
    assert bobot_sumber == 0.4
    assert skor_akhir == 40.0  # Dikalikan bobot sumber listing 0.4
