import math
from typing import Tuple, Dict

# Batas Geografis Wilayah Kesatuan Republik Indonesia (NKRI)
# Lintang: 6° LU s/d 11° LS (-11.0 s/d 6.0)
# Bujur: 95° BT s/d 141° BT (95.0 s/d 141.0)
INDONESIA_LAT_MIN = -11.0
INDONESIA_LAT_MAX = 6.0
INDONESIA_LON_MIN = 95.0
INDONESIA_LON_MAX = 141.0

EARTH_RADIUS_METERS = 6371000.0


def validate_indonesia_coordinates(lat: float, lon: float) -> Tuple[bool, str]:
    """
    Validasi apakah titik koordinat berada di dalam batas teritorial Indonesia.
    Mengembalikan tuple (is_valid, pesan_error).
    """
    if lat is None or lon is None:
        return False, "Koordinat latitude dan longitude tidak boleh kosong."

    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        return False, f"Nilai koordinat tidak valid: lat={lat}, lon={lon}."

    if not (INDONESIA_LAT_MIN <= lat <= INDONESIA_LAT_MAX):
        return False, (
            f"Koordinat latitude ({lat:.5f}) berada di luar wilayah Indonesia "
            f"[{INDONESIA_LAT_MIN} s/d {INDONESIA_LAT_MAX}]."
        )

    if not (INDONESIA_LON_MIN <= lon <= INDONESIA_LON_MAX):
        return False, (
            f"Koordinat longitude ({lon:.5f}) berada di luar wilayah Indonesia "
            f"[{INDONESIA_LON_MIN} s/d {INDONESIA_LON_MAX}]."
        )

    return True, ""


def calculate_bounding_box(lat: float, lon: float, radius_meters: float) -> Dict[str, float]:
    """
    Menghitung Bounding Box (min_lat, max_lat, min_lon, max_lon) untuk pencarian
    cepat berbasis indeks spasial (lat, lon) di MySQL.
    
    1 derajat lintang ≈ 111.139 meter
    1 derajat bujur ≈ 111.139 * cos(lat) meter
    """
    # Berikan buffer toleransi 5% untuk memastikan kelengkapan data
    buffered_radius = radius_meters * 1.05

    delta_lat = buffered_radius / 111139.0
    
    # Menghindari pembagian dengan nol di dekat kutub (Indonesia aman di khatulistiwa)
    cos_lat = math.cos(math.radians(lat))
    if abs(cos_lat) < 1e-6:
        cos_lat = 1e-6
    delta_lon = buffered_radius / (111139.0 * cos_lat)

    return {
        "min_lat": lat - delta_lat,
        "max_lat": lat + delta_lat,
        "min_lon": lon - delta_lon,
        "max_lon": lon + delta_lon,
    }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Menghitung jarak presisi antara dua titik koordinat di permukaan bumi dalam meter.
    Digunakan untuk mesin valuasi murni dan pengujian independen database.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_METERS * c
