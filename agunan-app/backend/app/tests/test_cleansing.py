from app.services.cleansing import (
    deduplicate_candidates,
    apply_asking_price_discount,
    remove_iqr_outliers,
    cleanse_candidates,
)


def test_deduplicate_candidates():
    candidates = [
        {
            "id": 1,
            "kode_referensi": "CMP-001",
            "sumber": "LISTING",
            "lat": -6.2383,
            "lon": 106.8528,
            "jarak_meter": 100,
        },
        {
            "id": 2,
            "kode_referensi": "CMP-002",
            "sumber": "APPRAISAL_KJPP",
            "lat": -6.238302,  # Kurang dari 5m dari titik pertama
            "lon": 106.852802,
            "jarak_meter": 99,
        },
        {
            "id": 3,
            "kode_referensi": "CMP-003",
            "sumber": "SURVEI",
            "lat": -6.2450,
            "lon": 106.8600,
            "jarak_meter": 800,
        },
    ]

    deduped = deduplicate_candidates(candidates)
    # Titik kedua harus menang atas titik pertama karena APPRAISAL_KJPP > LISTING
    assert len(deduped) == 2
    ids = [d["id"] for d in deduped]
    assert 2 in ids
    assert 1 not in ids
    assert 3 in ids


def test_apply_asking_price_discount():
    candidates = [
        {"sumber": "LISTING", "jenis_harga": "PENAWARAN", "harga_per_m2": 10000000.0},
        {"sumber": "APPRAISAL_KJPP", "jenis_harga": "NILAI_PASAR", "harga_per_m2": 10000000.0},
    ]

    # Diskon 10% (0.10)
    discounted = apply_asking_price_discount(candidates, diskon_penawaran_pct=0.10)
    assert discounted[0]["harga_cleansed_per_m2"] == 9000000.0
    assert discounted[0]["faktor_diskon_penawaran"] == 0.10

    # KJPP tidak didiskon
    assert discounted[1]["harga_cleansed_per_m2"] == 10000000.0
    assert discounted[1]["faktor_diskon_penawaran"] == 0.0


def test_remove_iqr_outliers():
    candidates = [
        {"id": 1, "harga_cleansed_per_m2": 10000000.0},
        {"id": 2, "harga_cleansed_per_m2": 10500000.0},
        {"id": 3, "harga_cleansed_per_m2": 11000000.0},
        {"id": 4, "harga_cleansed_per_m2": 11500000.0},
        {"id": 5, "harga_cleansed_per_m2": 95000000.0},  # Outlier ekstrem atas
    ]

    clean, outliers = remove_iqr_outliers(candidates)
    assert len(clean) == 4
    assert len(outliers) == 1
    assert outliers[0]["id"] == 5
