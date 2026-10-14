from app.services.geo import (
    validate_indonesia_coordinates,
    calculate_bounding_box,
    haversine_distance,
)


def test_validate_indonesia_coordinates():
    # Koordinat di dalam Indonesia
    # Jakarta: -6.2088, 106.8456
    is_valid, msg = validate_indonesia_coordinates(-6.2088, 106.8456)
    assert is_valid is True
    assert msg == ""

    # Sabang, Aceh: 5.8942, 95.3188
    is_valid, _ = validate_indonesia_coordinates(5.8942, 95.3188)
    assert is_valid is True

    # Merauke, Papua: -8.4991, 140.4010
    is_valid, _ = validate_indonesia_coordinates(-8.4991, 140.4010)
    assert is_valid is True

    # Rote, NTT: -10.7300, 123.1200
    is_valid, _ = validate_indonesia_coordinates(-10.7300, 123.1200)
    assert is_valid is True

    # Di luar Indonesia (Singapura: 1.3521, 103.8198 - wait lat is inside bbox, but let's test Tokyo / Sydney)
    # Sydney: -33.8688, 151.2093
    is_valid, msg = validate_indonesia_coordinates(-33.8688, 151.2093)
    assert is_valid is False
    assert "di luar wilayah Indonesia" in msg

    # Tokyo: 35.6762, 139.6503
    is_valid, msg = validate_indonesia_coordinates(35.6762, 139.6503)
    assert is_valid is False

    # London: 51.5074, -0.1278
    is_valid, msg = validate_indonesia_coordinates(51.5074, -0.1278)
    assert is_valid is False


def test_calculate_bounding_box():
    lat = -6.2383
    lon = 106.8528
    radius_meters = 1000.0

    bbox = calculate_bounding_box(lat, lon, radius_meters)
    assert bbox["min_lat"] < lat < bbox["max_lat"]
    assert bbox["min_lon"] < lon < bbox["max_lon"]

    # Jarak dari center ke batas harus sekitar radius (+ 5% buffer)
    dist_lat = haversine_distance(lat, lon, bbox["max_lat"], lon)
    assert 950 <= dist_lat <= 1100


def test_haversine_distance():
    # Monas (-6.1754, 106.8272) ke Bundaran HI (-6.1950, 106.8230) ≈ 2.2 km
    dist = haversine_distance(-6.1754, 106.8272, -6.1950, 106.8230)
    assert 2100 <= dist <= 2300
