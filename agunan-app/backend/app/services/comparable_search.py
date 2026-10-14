from datetime import date, timedelta
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.pembanding import Pembanding
from app.models.agunan import Agunan
from app.services.geo import calculate_bounding_box, haversine_distance


RADIUS_STEPS = [500, 1000, 2000, 5000]
MIN_CANDIDATE_COUNT = 5
MAX_DATA_AGE_DAYS = 365  # Usia data maksimal 12 bulan


def search_comparables_incremental(
    db: Session,
    target_lat: float,
    target_lon: float,
    target_luas: float,
    target_jenis_properti: str = "TANAH",
    reference_date: Optional[date] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Pencarian data pembanding bertahap dengan radius 500m, 1km, 2km, hingga 5km.
    Berhenti saat menemukan minimal 5 kandidat yang memenuhi filter:
    - Bounding Box (memanfaatkan indeks komposit lat/lon)
    - Jarak presisi via ST_Distance_Sphere (MySQL) atau Haversine
    - Jenis properti sama
    - Status valid = True
    - Usia data <= 12 bulan dari tanggal valuasi
    - Luas tanah 0.5x s/d 2.0x luas agunan

    Mengembalikan tuple: (list_kandidat_dengan_jarak, radius_efektif_meter)
    """
    if reference_date is None:
        reference_date = date.today()

    cutoff_date = reference_date - timedelta(days=MAX_DATA_AGE_DAYS)
    min_luas = target_luas * 0.5
    max_luas = target_luas * 2.0

    candidates_found: List[Dict[str, Any]] = []
    effective_radius = RADIUS_STEPS[-1]

    is_mysql = "mysql" in db.bind.dialect.name.lower()

    for radius in RADIUS_STEPS:
        bbox = calculate_bounding_box(target_lat, target_lon, radius)

        if is_mysql:
            # Query MySQL 8.0 dengan indeks spasial Bounding Box + ST_Distance_Sphere
            sql = text("""
                SELECT 
                    id, kode_referensi, sumber, jenis_harga, lat, lon, alamat, 
                    kota_kabupaten, provinsi, luas_tanah, harga_total, harga_per_m2, 
                    tanggal_data, legalitas, lebar_jalan, bentuk_tanah, jenis_properti, 
                    kualitas_geocode, status_valid, catatan, atribut_lain,
                    ST_Distance_Sphere(POINT(lon, lat), POINT(:target_lon, :target_lat)) AS jarak_meter
                FROM pembanding
                WHERE 
                    lat BETWEEN :min_lat AND :max_lat
                    AND lon BETWEEN :min_lon AND :max_lon
                    AND jenis_properti = :jenis_properti
                    AND status_valid = 1
                    AND tanggal_data >= :cutoff_date
                    AND luas_tanah BETWEEN :min_luas AND :max_luas
                HAVING jarak_meter <= :radius
                ORDER BY jarak_meter ASC
            """)
            result = db.execute(
                sql,
                {
                    "min_lat": bbox["min_lat"],
                    "max_lat": bbox["max_lat"],
                    "min_lon": bbox["min_lon"],
                    "max_lon": bbox["max_lon"],
                    "jenis_properti": target_jenis_properti,
                    "cutoff_date": cutoff_date,
                    "min_luas": min_luas,
                    "max_luas": max_luas,
                    "target_lat": target_lat,
                    "target_lon": target_lon,
                    "radius": radius,
                },
            )
            rows = result.mappings().all()
            current_candidates = [dict(r) for r in rows]
        else:
            # Fallback untuk pengujian (SQLite)
            query = (
                db.query(Pembanding)
                .filter(
                    Pembanding.lat.between(bbox["min_lat"], bbox["max_lat"]),
                    Pembanding.lon.between(bbox["min_lon"], bbox["max_lon"]),
                    Pembanding.jenis_properti == target_jenis_properti,
                    Pembanding.status_valid.is_(True),
                    Pembanding.tanggal_data >= cutoff_date,
                    Pembanding.luas_tanah.between(min_luas, max_luas),
                )
            )
            items = query.all()
            current_candidates = []
            for item in items:
                dist = haversine_distance(target_lat, target_lon, item.lat, item.lon)
                if dist <= radius:
                    item_dict = {
                        "id": item.id,
                        "kode_referensi": item.kode_referensi,
                        "sumber": item.sumber.value if hasattr(item.sumber, "value") else str(item.sumber),
                        "jenis_harga": item.jenis_harga.value if hasattr(item.jenis_harga, "value") else str(item.jenis_harga),
                        "lat": item.lat,
                        "lon": item.lon,
                        "alamat": item.alamat,
                        "kota_kabupaten": item.kota_kabupaten,
                        "provinsi": item.provinsi,
                        "luas_tanah": item.luas_tanah,
                        "harga_total": item.harga_total,
                        "harga_per_m2": item.harga_per_m2,
                        "tanggal_data": item.tanggal_data,
                        "legalitas": item.legalitas.value if hasattr(item.legalitas, "value") else str(item.legalitas),
                        "lebar_jalan": item.lebar_jalan,
                        "bentuk_tanah": item.bentuk_tanah.value if hasattr(item.bentuk_tanah, "value") else str(item.bentuk_tanah),
                        "jenis_properti": item.jenis_properti.value if hasattr(item.jenis_properti, "value") else str(item.jenis_properti),
                        "kualitas_geocode": item.kualitas_geocode.value if hasattr(item.kualitas_geocode, "value") else str(item.kualitas_geocode),
                        "status_valid": item.status_valid,
                        "catatan": item.catatan,
                        "atribut_lain": item.atribut_lain,
                        "jarak_meter": dist,
                    }
                    current_candidates.append(item_dict)
            current_candidates.sort(key=lambda x: x["jarak_meter"])

        candidates_found = current_candidates
        effective_radius = radius
        if len(candidates_found) >= MIN_CANDIDATE_COUNT:
            break

    return candidates_found, effective_radius
