from typing import List, Dict, Any, Tuple
import math
from app.services.geo import haversine_distance

SOURCE_PRIORITY = {
    "LELANG": 5,
    "APPRAISAL_KJPP": 4,
    "APPRAISAL_INTERNAL": 3,
    "SURVEI": 2,
    "LISTING": 1,
}


def deduplicate_candidates(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deduplikasi data pembanding jika berada pada lokasi yang sama (< 5 meter)
    atau memiliki nomor referensi duplikat. Data dengan sumber berprioritas lebih tinggi
    akan dipertahankan.
    """
    if not candidates:
        return []

    # Urutkan berdasarkan prioritas sumber tertinggi dahulu
    sorted_candidates = sorted(
        candidates,
        key=lambda x: (
            SOURCE_PRIORITY.get(str(x.get("sumber", "")), 0),
            -x.get("jarak_meter", 999999),
        ),
        reverse=True,
    )

    unique_list: List[Dict[str, Any]] = []

    for cand in sorted_candidates:
        is_duplicate = False
        lat = cand["lat"]
        lon = cand["lon"]
        kode = cand.get("kode_referensi")

        for existing in unique_list:
            # Cek kesamaan kode referensi
            if kode and kode == existing.get("kode_referensi"):
                is_duplicate = True
                break

            # Cek kedekatan spasial di bawah 5 meter
            dist = haversine_distance(lat, lon, existing["lat"], existing["lon"])
            if dist < 5.0:
                is_duplicate = True
                break

        if not is_duplicate:
            unique_list.append(cand)

    # Kembalikan urut berdasarkan jarak
    unique_list.sort(key=lambda x: x.get("jarak_meter", 0))
    return unique_list


def apply_asking_price_discount(
    candidates: List[Dict[str, Any]],
    diskon_penawaran_pct: float = 0.08,
) -> List[Dict[str, Any]]:
    """
    Normalisasi harga penawaran/listing menjadi estimasi harga transaksi riil
    menggunakan faktor diskon dari parameter valuasi (Standar Penilaian Indonesia).
    """
    processed = []
    for cand in candidates:
        c = dict(cand)
        sumber = str(c.get("sumber", "")).upper()
        jenis_harga = str(c.get("jenis_harga", "")).upper()

        if sumber == "LISTING" or jenis_harga == "PENAWARAN":
            faktor = diskon_penawaran_pct
        else:
            faktor = 0.0

        c["faktor_diskon_penawaran"] = faktor
        c["harga_cleansed_per_m2"] = c["harga_per_m2"] * (1.0 - faktor)
        processed.append(c)

    return processed


def remove_iqr_outliers(
    candidates: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Deteksi dan eliminasi data pencilan (outliers) berdasarkan metode Interquartile Range (IQR)
    pada nilai harga_cleansed_per_m2.
    
    Hanya dijalankan jika jumlah kandidat >= 4 untuk menjaga stabilitas statistik.
    Mengembalikan tuple: (clean_candidates, outlier_candidates)
    """
    if len(candidates) < 4:
        return candidates, []

    prices = sorted([c["harga_cleansed_per_m2"] for c in candidates])
    n = len(prices)

    def percentile(p: float) -> float:
        k = (n - 1) * p
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return prices[int(k)]
        d0 = prices[int(f)] * (c - k)
        d1 = prices[int(c)] * (k - f)
        return d0 + d1

    q1 = percentile(0.25)
    q3 = percentile(0.75)
    iqr = q3 - q1

    lower_bound = q1 - (1.5 * iqr)
    upper_bound = q3 + (1.5 * iqr)

    clean_list = []
    outlier_list = []

    for c in candidates:
        price = c["harga_cleansed_per_m2"]
        if lower_bound <= price <= upper_bound:
            clean_list.append(c)
        else:
            outlier_copy = dict(c)
            outlier_copy["alasan_outlier"] = f"Harga per m2 ({price:,.0f}) di luar batas IQR [{lower_bound:,.0f} s/d {upper_bound:,.0f}]"
            outlier_list.append(outlier_copy)

    # Jika setelah filter IQR kandidat menjadi < 2, kembalikan seluruh data untuk mencegah kegagalan valuasi prematur
    if len(clean_list) < 2:
        return candidates, []

    return clean_list, outlier_list


def cleanse_candidates(
    candidates: List[Dict[str, Any]],
    diskon_penawaran_pct: float = 0.08,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Pipeline lengkap pembersihan data:
    1. Deduplikasi
    2. Koreksi harga penawaran
    3. Filter outlier IQR
    """
    deduped = deduplicate_candidates(candidates)
    discounted = apply_asking_price_discount(deduped, diskon_penawaran_pct)
    clean, outliers = remove_iqr_outliers(discounted)
    return clean, outliers
