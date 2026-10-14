import asyncio
import json
import re
from collections import Counter
from html.parser import HTMLParser
from html import unescape
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()

# A coarse guard avoids unnecessary reverse-geocoding requests outside Bali.
BALI_BOUNDS = {"lat_min": -9.0, "lat_max": -8.0, "lon_min": 114.3, "lon_max": 115.9}
PRICE_PATTERN = re.compile(r"\bRp\.?\s*[\d.,]+\s*(?:miliar|milyar|juta|jt|M\b|/\s*m(?:2|²))?", re.IGNORECASE)
LAND_TYPE_TERMS = {
    "tanah_kosong": "tanah kosong",
    "kavling_perumahan": "tanah kavling perumahan",
    "pertanian_perkebunan": "tanah pertanian perkebunan",
    "komersial": "tanah komersial",
    "pariwisata": "tanah pariwisata",
    "lainnya": "tanah",
}
LAND_SHAPE_TERMS = {
    "persegi": "bentuk persegi",
    "persegi_panjang": "bentuk persegi panjang",
    "tidak_beraturan": "bentuk tidak beraturan",
    "segitiga": "bentuk segitiga",
    "l": "bentuk L",
    "lainnya": "",
}
AREA_TAG_LABELS = {
    "residential": "permukiman",
    "village_green": "ruang hijau permukiman",
    "farmland": "lahan pertanian/sawah",
    "farmyard": "area peternakan/pertanian",
    "orchard": "kebun buah",
    "vineyard": "perkebunan",
    "plant_nursery": "pembibitan tanaman",
    "forest": "hutan",
    "meadow": "padang rumput/lahan terbuka",
    "grass": "area rumput",
    "scrub": "semak belukar",
    "commercial": "area komersial",
    "retail": "area perdagangan/retail",
    "industrial": "area industri",
    "construction": "area pembangunan",
    "allotments": "kebun warga",
}
UNIT_PRICE_PATTERN = re.compile(
    r"(?P<amount>(?:(?:rp\.?|idr)\s*)?\d[\d.,]*(?:\s*(?:miliar|milyar|juta|jt|m\b))?)\s*"
    r"(?P<unit>(?:/\s*(?:100\s*)?(?:m²|m2|meter(?:\s+persegi)?|are)|"
    r"per\s*(?:100\s*)?(?:m²|m2|meter(?:\s+persegi)?|are)))",
    re.IGNORECASE,
)
PRICE_PER_M2_PATTERN = re.compile(
    r"(?P<amount>(?:(?:rp\.?|idr)\s*)?\d[\d.,]*(?:\s*(?:miliar|milyar|juta|jt|m\b))?)\s*"
    r"(?:/\s*(?:m²|m2|meter(?:\s+persegi)?)|per\s+(?:m²|m2|meter(?:\s+persegi)?))",
    re.IGNORECASE,
)
LAND_AREA_PATTERN = re.compile(
    r"(?P<area>\d[\d.,]*)\s*(?P<unit>m²|m2|meter(?:\s+persegi)?|are)\b",
    re.IGNORECASE,
)
LABELED_LAND_AREA_PATTERN = re.compile(
    r"(?:luas(?:\s+tanah)?|\bLT\b|tanah\s+seluas|seluas)[^\d]{0,80}"
    r"(?P<area>\d[\d.,]*)\s*(?P<unit>m²|m2|meter(?:\s+persegi)?|are)\b",
    re.IGNORECASE,
)
LABELED_PRICE_PATTERN = re.compile(
    r"(?:harga(?:\s+jual)?|dijual(?:\s+seharga)?|price)\s*[:\-]?\s*"
    r"(?P<amount>(?:(?:rp\.?|idr)\s*)?\d[\d.,]*(?:\s*(?:miliar|milyar|juta|jt|m\b))?)",
    re.IGNORECASE,
)
TOTAL_PRICE_PATTERN = re.compile(
    r"(?P<amount>(?:(?:rp\.?|idr)\s*)?\d[\d.,]*(?:\s*(?:miliar|milyar|juta|jt|m\b))?)\s+total\b",
    re.IGNORECASE,
)
WIDTH_PATTERN = re.compile(r"(?:lebar(?:\s+tanah|\s+depan)?|lebar)\s*[:\-]?\s*(?:±|\+/-|\+\-)??\s*(\d+(?:[.,]\d+)?)\s*(?:m|mtr|meter)\b", re.IGNORECASE)
DIMENSIONS_PATTERN = re.compile(r"(?:PxL\s*[:\-]?\s*)?\(?\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*\)?\s*(?:m²|m2|m|mtr|meter)\b", re.IGNORECASE)
FACING_PATTERN = re.compile(r"\bhadap\s*[:\-]?\s*(utara|selatan|timur|barat|timur\s+laut|tenggara|barat\s+daya|barat\s+laut)\b", re.IGNORECASE)
ROAD_ACCESS_PATTERN = re.compile(r"(?:akses\s+jalan|akses)\s*[:\-]?\s*([^.;\n]{3,100}?)(?=\s+\b(?:harga|hadap|luas|lebar|zona|zonasi|SHM|SHGB|sertifikat)\b|[.;\n]|$)", re.IGNORECASE)
ZONING_PATTERN = re.compile(r"\b(zona\s*(?:kuning|hijau|merah|pink|perumahan|komersial|pariwisata)|ITR\s*[:\-]?\s*[^.;\n]{2,45})", re.IGNORECASE)
STREET_ADDRESS_PATTERN = re.compile(
    r"\b(?:Jl\.?|Jalan|Gang|Gg\.?)\s*[^,;|\n.]{2,65}(?:,\s*[^,;|\n.]{2,55})?"
    r"(?=\s*(?:,|Detail\s*:|LT\b|Luas\b|Hadap\b|Akses\b|Harga\b|Zona\b|SHM\b|$))",
    re.IGNORECASE,
)
NEARBY_PATTERN = re.compile(r"\b\d+\s*(?:mnt|menit)\s+(?:ke|dari)\s+[^,;.\n]{2,70}", re.IGNORECASE)


class _ListingPageParser(HTMLParser):
    """Collect visible text, page metadata, and JSON-LD from a public listing page."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.visible_parts: list[str] = []
        self.meta: dict[str, str] = {}
        self.jsonld_parts: list[str] = []
        self._hidden_depth = 0
        self._jsonld_depth = 0
        self._title_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key.lower(): value or "" for key, value in attrs}
        if tag in {"script", "style", "noscript", "svg"}:
            if tag == "script" and "ld+json" in attributes.get("type", "").lower():
                self._jsonld_depth += 1
            else:
                self._hidden_depth += 1
        elif tag == "title":
            self._title_depth += 1
        elif tag == "meta":
            name = (attributes.get("name") or attributes.get("property") or "").lower()
            content = attributes.get("content", "").strip()
            if content and name in {"description", "og:description", "og:title", "product:price:amount", "product:price:currency"}:
                self.meta[name] = content

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._jsonld_depth:
            self._jsonld_depth -= 1
        elif tag in {"script", "style", "noscript", "svg"} and self._hidden_depth:
            self._hidden_depth -= 1
        elif tag == "title" and self._title_depth:
            self._title_depth -= 1

    def handle_data(self, data: str) -> None:
        cleaned = " ".join(data.split())
        if not cleaned:
            return
        if self._jsonld_depth:
            self.jsonld_parts.append(cleaned)
        elif not self._hidden_depth:
            self.visible_parts.append(cleaned)


def _plain_text(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def _jsonld_listing_text(jsonld_parts: list[str]) -> str:
    useful_values: list[str] = []
    useful_keys = {
        "name", "description", "streetaddress", "addresslocality", "addressregion",
        "postalcode", "floorSize", "area", "price", "priceCurrency", "telephone",
        "offers", "landSize", "additionalProperty", "value", "unitText",
    }

    def collect(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key in useful_keys and isinstance(child, (str, int, float)):
                    useful_values.append(str(child))
                collect(child)
        elif isinstance(value, list):
            for child in value:
                collect(child)

    for part in jsonld_parts:
        try:
            collect(json.loads(part))
        except (ValueError, TypeError):
            continue
    return " ".join(useful_values)


def _listing_description_from_parts(parts: list[str]) -> str | None:
    for index, part in enumerate(parts):
        if part.strip().casefold() == "deskripsi":
            section_parts = []
            for offset, following in enumerate(parts[index + 1:], start=index + 1):
                normalized = following.strip()
                if not normalized:
                    continue
                if re.match(r"^(?:agen(?:\s+korporat)?|dijual oleh|dipasang oleh|hubungi|whatsapp|beranda|layanan pengaduan)\b", normalized, re.IGNORECASE):
                    break
                if len(normalized) <= 60 and offset + 1 < len(parts) and re.match(r"^agen(?:\s+korporat)?\b", parts[offset + 1].strip(), re.IGNORECASE):
                    break
                section_parts.append(normalized)
                if len(" ".join(section_parts)) >= 1400:
                    break
            return " ".join(section_parts)[:1400] or None
    return None


async def _fetch_listing_page_details(
    client: httpx.AsyncClient,
    item: dict[str, Any],
    semaphore: asyncio.Semaphore,
) -> dict[str, Any] | None:
    url = item.get("url", "")
    if not any(host in url.lower() for host in ("rumah123.com/properti/", "lamudi.co.id/jual/bali/")):
        return None
    try:
        async with semaphore:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; BaliLandMarketSearch/1.0)",
                    "Accept": "text/html,application/xhtml+xml",
                },
                timeout=httpx.Timeout(7.0, connect=3.0),
            )
            if response.status_code != 200 or "html" not in response.headers.get("content-type", "").lower():
                return None
            parser = _ListingPageParser()
            parser.feed(response.text[:1_500_000])
            visible_text = "\n".join(parser.visible_parts)
            jsonld_text = _jsonld_listing_text(parser.jsonld_parts)
            description = parser.meta.get("og:description") or parser.meta.get("description")
            listing_description = _listing_description_from_parts(parser.visible_parts)
            return {
                "page_detail_text": "\n".join(part for part in (visible_text, jsonld_text, description or "") if part),
                "page_description": description,
                "page_listing_description": listing_description,
                "page_title": parser.meta.get("og:title"),
                "page_enriched": True,
            }
    except (httpx.HTTPError, ValueError):
        return None


def _parse_amount_to_idr(raw_amount: str) -> float | None:
    """Parse common Indonesian listing price notation to rupiah."""
    amount = re.sub(r"^(?:rp\.?|idr)\s*", "", raw_amount.strip(), flags=re.IGNORECASE)
    suffix_match = re.search(r"\s*(miliar|milyar|juta|jt|m)$", amount, re.IGNORECASE)
    suffix = suffix_match.group(1).lower() if suffix_match else ""
    number = amount[:suffix_match.start()].strip() if suffix_match else amount
    if "." in number and "," in number:
        number = number.replace(".", "").replace(",", ".") if number.rfind(",") > number.rfind(".") else number.replace(",", "")
    elif number.count(".") > 1 or number.count(",") > 1:
        separator = "." if "." in number else ","
        number = number.replace(separator, "")
    elif suffix and ("." in number or "," in number):
        number = number.replace(",", ".")
    elif "," in number or "." in number:
        separator = "," if "," in number else "."
        left, right = number.rsplit(separator, 1)
        number = left + right if len(right) == 3 else left + "." + right.replace(separator, "")
    try:
        parsed = float(number)
    except ValueError:
        return None
    multiplier = 1_000_000_000 if suffix in {"miliar", "milyar", "m"} else 1_000_000 if suffix in {"juta", "jt"} else 1
    total = parsed * multiplier
    return total if total > 0 else None


def _parse_listing_area_m2(text: str) -> float | None:
    labeled_matches = [
        match for match in LABELED_LAND_AREA_PATTERN.finditer(text)
        if not re.search(r"(?:di\s*atas|diatas|lebih\s+dari|minimal|mulai\s+dari)", match.group(0), re.IGNORECASE)
    ]
    matches = labeled_matches or list(LAND_AREA_PATTERN.finditer(text))
    if not matches:
        return None
    # Prefer explicitly labelled area and ignore title thresholds like “luas di atas 3.000 m²”.
    match = matches[0]
    raw_value = match.group("area")
    if "." in raw_value and "," in raw_value:
        raw_value = raw_value.replace(".", "").replace(",", ".") if raw_value.rfind(",") > raw_value.rfind(".") else raw_value.replace(",", "")
    elif raw_value.count(".") > 1 or raw_value.count(",") > 1:
        raw_value = raw_value.replace(".", "").replace(",", "")
    elif "." in raw_value or "," in raw_value:
        separator = "." if "." in raw_value else ","
        left, right = raw_value.rsplit(separator, 1)
        raw_value = left + right if len(right) == 3 else left + "." + right
    try:
        area = float(raw_value)
    except ValueError:
        return None
    if match.group("unit").lower().startswith("are"):
        area *= 100
    return area if area > 0 else None


def _extract_listing_summary(result: dict[str, Any]) -> dict[str, Any]:
    """Extract land area, total offer, and per-are price from a search snippet."""
    snippet_text = unescape(re.sub(r"<[^>]+>", " ", f"{result.get('title', '')} {result.get('description', '')}"))
    detail_text = unescape(result.get("page_detail_text", ""))
    listing_text = result.get("page_listing_description") or snippet_text
    text = " ".join(part for part in (detail_text, snippet_text) if part)
    area_m2 = _parse_listing_area_m2(detail_text) if detail_text else None
    if area_m2 is None:
        area_m2 = _parse_listing_area_m2(snippet_text)

    price_per_are = None
    unit_match = next((
        match
        for source_text in (listing_text, detail_text, snippet_text)
        if (match := UNIT_PRICE_PATTERN.search(source_text))
    ), None)
    if unit_match:
        amount = _parse_amount_to_idr(unit_match.group("amount"))
        if amount is not None:
            unit = unit_match.group("unit").lower().replace("²", "2")
            price_per_are = round(amount if "are" in unit or "100" in unit else amount * 100)

    if price_per_are is None:
        per_m2_match = next((
            match
            for source_text in (listing_text, detail_text, snippet_text)
            if (match := PRICE_PER_M2_PATTERN.search(source_text))
        ), None)
        if per_m2_match:
            amount = _parse_amount_to_idr(per_m2_match.group("amount"))
            if amount is not None:
                price_per_are = round(amount * 100)

    total_price = None
    for source_text in (listing_text, detail_text, snippet_text):
        total_match = TOTAL_PRICE_PATTERN.search(source_text)
        if total_match:
            total_price = _parse_amount_to_idr(total_match.group("amount"))
            if total_price is not None:
                break
    for source_text in (listing_text, detail_text, snippet_text):
        if total_price is not None:
            break
        for match in LABELED_PRICE_PATTERN.finditer(source_text):
            suffix = source_text[match.end():match.end() + 18]
            if re.match(r"\s*(?:/\s*(?:are|100\s*m|m²|m2|meter)|per\s*(?:are|100\s*m|m²|m2|meter))", suffix, re.IGNORECASE):
                continue
            total_price = _parse_amount_to_idr(match.group("amount"))
            if total_price is not None:
                break

    total_price_is_estimate = False
    if total_price is None and price_per_are is not None and area_m2 is not None:
        total_price = round(price_per_are * area_m2 / 100)
        total_price_is_estimate = True
    if price_per_are is None and total_price is not None and area_m2 is not None:
        price_per_are = round(total_price / area_m2 * 100)

    ownership_match = re.search(r"\b(SHM|SHGB|HGB|HP|HGU|AJB|GIRIK|LETTER\s+C|PETOK\s+D)\b", text, re.IGNORECASE)
    shape_match = re.search(r"\b(persegi\s+panjang|persegi|tidak\s+beraturan|segitiga|bentuk\s+L)\b", text, re.IGNORECASE)
    address_match = STREET_ADDRESS_PATTERN.search(listing_text)
    if not address_match:
        address_match = re.search(r"(?:alamat|lokasi)\s*[:\-]\s*([^<>\n.;]{5,140})", listing_text, re.IGNORECASE)
    phone_match = re.search(r"(?<!\d)(?:\+?62|0)8[\d\s().-]{7,16}\d(?!\d)", text)
    width_match = WIDTH_PATTERN.search(listing_text) or WIDTH_PATTERN.search(detail_text)
    dimensions_match = DIMENSIONS_PATTERN.search(listing_text) or DIMENSIONS_PATTERN.search(detail_text)
    facing_match = FACING_PATTERN.search(listing_text)
    access_match = ROAD_ACCESS_PATTERN.search(listing_text)
    zoning_match = ZONING_PATTERN.search(listing_text)
    nearby_matches = NEARBY_PATTERN.findall(listing_text)
    normalized_text = text.lower()
    if re.search(r"tanah\s+kosong|lahan\s+kosong", normalized_text):
        property_type = "TANAH KOSONG"
    elif "kavling" in normalized_text:
        property_type = "TANAH KAVLING"
    elif "sawah" in normalized_text:
        property_type = "TANAH SAWAH"
    elif re.search(r"\bkebun\b|perkebunan", normalized_text):
        property_type = "TANAH KEBUN"
    else:
        property_type = None

    return {
        "area_m2": round(area_m2, 2) if area_m2 is not None else None,
        "total_price": round(total_price) if total_price is not None else None,
        "total_price_is_estimate": total_price_is_estimate,
        "price_per_are": price_per_are,
        "comparison_data": {
            "property_type": property_type,
            "address": address_match.group(0).strip(" ,") if address_match and address_match.re is STREET_ADDRESS_PATTERN else address_match.group(1).strip() if address_match else None,
            "ownership": ownership_match.group(1).upper() if ownership_match else None,
            "land_shape": shape_match.group(1).upper() if shape_match else None,
            "source_name": result.get("meta_url", {}).get("hostname"),
            "contact_phone": re.sub(r"[^\d+]", "", phone_match.group(0)) if phone_match else None,
            "width_m": width_match.group(1).replace(",", ".") if width_match else None,
            "dimensions_m": f"{dimensions_match.group(1)} × {dimensions_match.group(2)} m" if dimensions_match else None,
            "facing": facing_match.group(1).title() if facing_match else None,
            "road_access": access_match.group(1).strip() if access_match else None,
            "zoning": zoning_match.group(1).strip() if zoning_match else None,
            "nearby": list(dict.fromkeys(value.strip() for value in nearby_matches))[:6],
            "listing_description": result.get("page_listing_description") or result.get("page_description"),
            "page_enriched": bool(result.get("page_enriched")),
        },
        "summary_note": None if area_m2 is not None or total_price is not None or price_per_are is not None else "Rincian luas/harga tidak tercantum jelas pada cuplikan; periksa halaman sumber.",
    }


def _extract_unit_prices(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    observations = []
    for result in results:
        text = re.sub(r"<[^>]+>", " ", f"{result.get('title', '')} {result.get('description', '')}")
        for match in UNIT_PRICE_PATTERN.finditer(text):
            amount_idr = _parse_amount_to_idr(match.group("amount"))
            if amount_idr is None:
                continue
            unit = match.group("unit").lower().replace("²", "2")
            basis_are = "are" in unit or "100" in unit
            price_per_are = amount_idr if basis_are else amount_idr * 100
            observations.append({
                "price_per_are": round(price_per_are),
                "price_per_m2": round(price_per_are / 100),
                "source": result.get("meta_url", {}).get("hostname", "Sumber internet"),
                "url": result.get("url"),
            })
    return observations


def _summarize_unit_prices(observations: list[dict[str, Any]]) -> dict[str, Any]:
    if not observations:
        return {
            "sample_count": 0,
            "price_per_are": None,
            "price_per_m2": None,
            "conclusion": "Belum ditemukan cukup informasi harga yang secara eksplisit mencantumkan satuan per are atau per m². Buka referensi sumber untuk memeriksa harga dan luas bidang secara langsung.",
        }

    def summarize(values: list[int]) -> dict[str, int]:
        ordered = sorted(values)
        count = len(ordered)
        median = ordered[count // 2] if count % 2 else round((ordered[count // 2 - 1] + ordered[count // 2]) / 2)
        return {"median": median, "minimum": ordered[0], "maximum": ordered[-1]}

    per_are = summarize([item["price_per_are"] for item in observations])
    per_m2 = summarize([item["price_per_m2"] for item in observations])
    format_idr = lambda value: f"{value:,}".replace(",", ".")
    return {
        "sample_count": len(observations),
        "price_per_are": per_are,
        "price_per_m2": per_m2,
        "conclusion": (
            f"Dari {len(observations)} kutipan penawaran yang menyebut harga per satuan secara eksplisit, "
            f"nilai tengah indikatif sekitar Rp {format_idr(per_are['median'])} per are "
            f"(Rp {format_idr(per_m2['median'])} per m²). Rentang yang terdeteksi: "
            f"Rp {format_idr(per_are['minimum'])}–Rp {format_idr(per_are['maximum'])} per are."
        ),
    }


def _inside_bali_bounds(lat: float, lon: float) -> bool:
    return (
        BALI_BOUNDS["lat_min"] <= lat <= BALI_BOUNDS["lat_max"]
        and BALI_BOUNDS["lon_min"] <= lon <= BALI_BOUNDS["lon_max"]
    )


def _locality_search_levels(address: dict[str, Any]) -> list[dict[str, str]]:
    """Build progressively wider village-to-regency search areas from Nominatim."""
    village = next((address.get(key) for key in ("village", "hamlet", "quarter", "neighbourhood", "suburb") if address.get(key)), None)
    subdistrict = next((address.get(key) for key in ("city_district", "district", "town", "municipality") if address.get(key)), None)
    city = next((address.get(key) for key in ("city", "county", "state_district") if address.get(key)), None)

    levels = []
    if village and subdistrict:
        levels.append({"level": "Desa/kelurahan", "area": f"{village} {subdistrict}"})
    if village:
        levels.append({"level": "Desa/kelurahan", "area": village})
    if subdistrict and city:
        levels.append({"level": "Kecamatan", "area": f"{subdistrict} {city}"})
    elif subdistrict:
        levels.append({"level": "Kecamatan", "area": subdistrict})
    if city:
        levels.append({"level": "Kabupaten/kota", "area": city})

    unique_levels = []
    seen = set()
    for item in levels:
        normalized = item["area"].strip().casefold()
        if normalized and normalized not in seen:
            seen.add(normalized)
            unique_levels.append(item)
    if not unique_levels:
        unique_levels.append({"level": "Bali", "area": "Bali"})
    return unique_levels[:4]


def _street_name(address: dict[str, Any]) -> str | None:
    """Return the nearest mapped street/alley name for the selected coordinate."""
    return next((
        str(address[key]).strip()
        for key in ("road", "residential", "pedestrian", "living_street", "service", "footway", "path", "unclassified")
        if address.get(key) and str(address[key]).strip()
    ), None)


def _is_individual_land_listing(item: dict[str, Any]) -> bool:
    """Return true only for a specific property detail page, not a portal category."""
    url = item.get("url", "").lower()
    path = re.sub(r"\?.*$", "", url)
    text = f"{item.get('title', '')} {item.get('description', '')}".lower()
    land_terms = ("tanah", "lahan", "kavling", "kebun", "sawah")
    if not any(term in text for term in land_terms):
        return False

    if "rumah123.com/properti/" in path:
        return bool(re.search(r"/(?:las|hos)\d+/?$", path))
    if "lamudi.co.id/jual/bali/" in path:
        if re.search(r"/di-bawah-\d+/?$", path):
            return False
        return bool(re.search(r"-[0-9]{10,}/?$", path))
    if "facebook.com/marketplace/item/" in path:
        return True
    if "facebook.com/groups/" in path and re.search(r"/posts/|/permalink/", path):
        return True
    if "pinhome.id/" in path and "/unit/" in path:
        return True
    return False


async def _analyze_area_context(client: httpx.AsyncClient, lat: float, lon: float) -> dict[str, Any]:
    """Summarize mapped land-use and buildings within 1 km using OpenStreetMap."""
    query = f"""[out:json][timeout:18];
(
  nwr(around:1000,{lat},{lon})[landuse];
  nwr(around:1000,{lat},{lon})[natural~"^(wood|scrub|wetland|grassland)$"];
  nwr(around:1000,{lat},{lon})[building];
);
out tags center;"""
    try:
        response = await client.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": query},
            headers={"User-Agent": "BaliLandMarketSearch/1.0 (OpenStreetMap area context)"},
            timeout=httpx.Timeout(22.0, connect=5.0),
        )
        response.raise_for_status()
        elements = response.json().get("elements", [])
    except (httpx.HTTPError, ValueError):
        return {
            "status": "unavailable",
            "radius_m": 1000,
            "counts": {},
            "building_count": None,
            "observed_categories": [],
            "summary": "Data tutupan lahan dari OpenStreetMap sementara tidak tersedia. Ini tidak memengaruhi hasil pencarian harga.",
            "price_implication": "Kondisi areal belum dapat dinilai, sehingga indikasi harga hanya didasarkan pada kutipan penawaran yang ditemukan dan belum diberi konteks permukiman, sawah, atau kebun.",
            "source": "OpenStreetMap / Overpass API",
        }

    counts: Counter[str] = Counter()
    building_count = 0
    for element in elements:
        tags = element.get("tags", {})
        landuse = tags.get("landuse")
        natural = tags.get("natural")
        if landuse in AREA_TAG_LABELS:
            counts[AREA_TAG_LABELS[landuse]] += 1
        elif natural in AREA_TAG_LABELS:
            counts[AREA_TAG_LABELS[natural]] += 1
        if "building" in tags and tags.get("building") not in {"no", "construction"}:
            building_count += 1

    ordered = counts.most_common()
    observed_categories = [
        {"category": category, "feature_count": count}
        for category, count in ordered[:6]
    ]
    residential_count = counts.get("permukiman", 0)
    developed_count = residential_count + counts.get("area komersial", 0) + counts.get("area perdagangan/retail", 0) + counts.get("area industri", 0)
    agricultural_count = sum(counts.get(label, 0) for label in (
        "lahan pertanian/sawah", "area peternakan/pertanian", "kebun buah",
        "perkebunan", "pembibitan tanaman", "kebun warga",
    ))
    green_count = sum(counts.get(label, 0) for label in (
        "hutan", "padang rumput/lahan terbuka", "area rumput", "semak belukar",
    ))

    dominant = ordered[0][0] if ordered else None
    if not elements:
        summary = "Belum ada objek penggunaan lahan atau bangunan yang cukup terpetakan di OpenStreetMap dalam radius 1 km; ini tidak memastikan area benar-benar kosong."
        density = "data peta terbatas"
        price_implication = "Karena pemetaan kondisi areal belum cukup, jangan menyimpulkan harga lebih rendah atau lebih tinggi dari data ini saja; gunakan pembanding yang benar-benar serupa lokasinya."
    else:
        density = "banyak objek bangunan terpetakan" if building_count >= 150 else "kepadatan bangunan terpetakan sedang" if building_count >= 40 else "relatif sedikit objek bangunan terpetakan"
        if agricultural_count > developed_count and agricultural_count >= 2:
            summary = f"Area sekitar didominasi objek pertanian/kebun yang terpetakan, dengan {density}. Ini dapat menunjukkan karakter lebih rural; akses, zonasi, dan kedekatan pusat aktivitas tetap sangat memengaruhi harga."
            price_implication = "Jika sawah/kebun lebih dominan, indikasi harga dari pusat permukiman atau kawasan komersial mungkin kurang sebanding dan dapat melebihkan konteks lokal. Harga perlu dibandingkan dengan lahan rural yang akses serta peruntukannya serupa; ini bukan potongan harga otomatis."
        elif residential_count > 0 and building_count >= 40:
            summary = f"Terindikasi kawasan permukiman dengan {density}. Aktivitas dan akses sekitar dapat mendukung minat pasar, tetapi tidak otomatis menentukan harga bidang."
            price_implication = "Kawasan terbangun/permukiman dapat mendukung permintaan dan akses, sehingga kisaran lokal berpotensi berbeda dari sawah atau kebun yang lebih terpencil. Faktor ini memberi konteks pasar, bukan kenaikan harga otomatis."
        elif green_count > residential_count and green_count >= 2:
            summary = f"Lebih banyak objek ruang hijau/lahan terbuka yang terpetakan daripada permukiman; sekitar {density}. Kondisi ini bisa mencerminkan area kurang terbangun, namun status zonasi dan akses perlu diperiksa."
            price_implication = "Ruang terbuka yang dominan dapat menandakan karakter lebih renggang daripada kawasan terbangun; harga pembanding pusat permukiman perlu digunakan hati-hati. Pastikan akses dan zonasi sebelum menarik kesimpulan."
        elif dominant:
            summary = f"Kategori penggunaan lahan yang paling banyak terpetakan adalah {dominant}, dengan {density}. Data peta bersifat indikatif dan bukan pengganti survei lapangan atau pemeriksaan tata ruang."
            price_implication = f"Konteks {dominant} menjadi faktor pembanding kualitatif. Prioritaskan referensi dengan karakter area, akses, dan peruntukan yang serupa; informasi ini tidak cukup untuk mengubah harga secara numerik."
        else:
            summary = f"Terpetakan {density}, tetapi kategori penggunaan lahan belum cukup lengkap untuk menyimpulkan dominasi sawah, kebun, atau permukiman."
            price_implication = "Data tutupan lahan belum menunjukkan dominasi yang jelas. Indikasi harga sebaiknya dibaca bersama verifikasi kondisi lapangan dan pembanding setempat."

    return {
        "status": "available",
        "radius_m": 1000,
        "counts": dict(counts),
        "building_count": building_count,
        "observed_categories": observed_categories,
        "summary": summary,
        "price_implication": price_implication,
        "source": "OpenStreetMap / Overpass API",
        "caveat": "Jumlah adalah fitur yang dipetakan, bukan persentase luas wilayah. Kelengkapan OSM berbeda-beda dan tidak menjelaskan status legal/zona atau harga transaksi.",
    }


@router.get("")
async def search_bali_land_market(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    land_type: str = Query("tanah_kosong", pattern="^(tanah_kosong|kavling_perumahan|pertanian_perkebunan|komersial|pariwisata|lainnya)$"),
    land_shape: str = Query("persegi", pattern="^(persegi|persegi_panjang|tidak_beraturan|segitiga|l|lainnya)$"),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Search web references for land listings near a coordinate in Bali."""
    if not _inside_bali_bounds(lat, lon):
        raise HTTPException(status_code=400, detail="Koordinat harus berada di wilayah Bali.")
    if not settings.BRAVE_SEARCH_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Pencarian internet belum diaktifkan. Atur BRAVE_SEARCH_API_KEY pada konfigurasi backend.",
        )

    headers = {"User-Agent": f"{settings.APP_NAME}/{settings.APP_VERSION} (market reference search)"}
    timeout = httpx.Timeout(12.0, connect=5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            location_response = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "jsonv2", "zoom": 18, "addressdetails": 1},
                headers=headers,
            )
            location_response.raise_for_status()
            location_data = location_response.json()
            address = location_data.get("address", {})
            bali_region = " ".join(
                str(address.get(key, ""))
                for key in ("state", "province", "state_district", "county")
            )
            if "bali" not in bali_region.lower():
                raise HTTPException(status_code=400, detail="Titik koordinat tidak terverifikasi berada di Provinsi Bali.")

            locality_levels = _locality_search_levels(address)
            area = locality_levels[0]["area"]
            street = _street_name(address)
            street_search_area = " ".join(filter(None, [street, area, "Bali"])) if street else None
            area_context = await _analyze_area_context(client, lat, lon)
            search_headers = {
                "X-Subscription-Token": settings.BRAVE_SEARCH_API_KEY,
                "Accept": "application/json",
            }
            # Search each available admin level, from village/kelurahan outward
            # through kecamatan and kabupaten/kota to Bali-wide context.
            queries = []
            if street_search_area:
                queries.append({
                    "level": "Jalan/gang",
                    "area": street_search_area,
                    "query": " ".join(filter(None, [
                        "jual", LAND_TYPE_TERMS[land_type], LAND_SHAPE_TERMS[land_shape],
                        street_search_area, "harga tanah",
                    ])),
                })
            for index, locality in enumerate(locality_levels):
                include_shape = index == 0 and LAND_SHAPE_TERMS[land_shape]
                query = " ".join(filter(None, [
                    "jual", LAND_TYPE_TERMS[land_type],
                    LAND_SHAPE_TERMS[land_shape] if include_shape else "",
                    locality["area"], "Bali", "harga tanah",
                ]))
                queries.append({"level": locality["level"], "area": locality["area"], "query": query})
            queries.append({"level": "Provinsi", "area": "Bali", "query": f"jual {LAND_TYPE_TERMS[land_type]} Bali harga tanah"})

            general_results = []
            general_seen_urls = set()
            locality_queries_used = []
            for query_entry in queries:
                search_response = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={"q": query_entry["query"], "count": 10, "country": "ID", "result_filter": "web"},
                    headers=search_headers,
                )
                search_response.raise_for_status()
                query_results = search_response.json().get("web", {}).get("results", [])
                locality_queries_used.append({
                    "level": query_entry["level"],
                    "area": query_entry["area"],
                    "result_count": len(query_results),
                })
                for item in query_results:
                    item_url = item.get("url")
                    if item_url and item_url not in general_seen_urls:
                        general_seen_urls.add(item_url)
                        item["matched_locality_level"] = query_entry["level"]
                        item["matched_locality_area"] = query_entry["area"]
                        general_results.append(item)
                if len(general_results) >= 30:
                    break

            # Search portal-specific detail URL spaces separately: these are
            # individual properties, unlike the category pages returned by broad queries.
            detail_queries = [
                {
                    "portal": "Rumah123",
                    "query": f"site:rumah123.com/properti/ tanah dijual {street_search_area or area} Bali harga luas tanah",
                },
                {
                    "portal": "Lamudi",
                    "query": f"site:lamudi.co.id/jual/bali/ tanah dijual {street_search_area or area} Bali luas tanah m2 harga Rp",
                },
            ]
            detail_results = []
            detail_seen_urls = set()
            detail_queries_used = []
            for detail_query in detail_queries:
                detail_response = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={"q": detail_query["query"], "count": 10, "country": "ID", "result_filter": "web"},
                    headers=search_headers,
                )
                detail_response.raise_for_status()
                portal_results = detail_response.json().get("web", {}).get("results", [])
                detail_queries_used.append({"portal": detail_query["portal"], "result_count": len(portal_results)})
                for item in portal_results:
                    item_url = item.get("url")
                    if item_url and item_url not in detail_seen_urls:
                        detail_seen_urls.add(item_url)
                        item["matched_locality_level"] = "Jalan/gang" if street else "Detail listing"
                        item["matched_locality_area"] = street_search_area or area
                        detail_results.append(item)

            # Brave can surface publicly indexed Marketplace pages and public group posts.
            # This does not access private groups, login-only content, or scrape Facebook.
            facebook_results = []
            facebook_seen_urls = set()
            facebook_queries = (
                [f"site:facebook.com/marketplace OR site:facebook.com/groups tanah dijual {street_search_area}"]
                if street_search_area else []
            ) + [
                f"site:facebook.com/marketplace OR site:facebook.com/groups tanah dijual {locality['area']} Bali"
                for locality in locality_levels[:2]
            ]
            facebook_queries_used = []
            for facebook_query in facebook_queries:
                facebook_response = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={"q": facebook_query, "count": 10, "country": "ID", "result_filter": "web"},
                    headers=search_headers,
                )
                facebook_response.raise_for_status()
                query_results = facebook_response.json().get("web", {}).get("results", [])
                facebook_queries_used.append(facebook_query)
                for item in query_results:
                    item_url = item.get("url")
                    if item_url and item_url not in facebook_seen_urls:
                        facebook_seen_urls.add(item_url)
                        item["matched_locality_level"] = "Facebook publik"
                        item["matched_locality_area"] = street_search_area or area
                        facebook_results.append(item)
            merged_results = []
            seen_urls = set()
            for item in detail_results + general_results + facebook_results:
                url = item.get("url")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    merged_results.append(item)

            enrichable_results = [item for item in merged_results if _is_individual_land_listing(item)][:12]
            detail_semaphore = asyncio.Semaphore(4)
            page_details = await asyncio.gather(*(
                _fetch_listing_page_details(client, item, detail_semaphore)
                for item in enrichable_results
            ))
            enriched_count = 0
            for item, page_detail in zip(enrichable_results, page_details):
                if page_detail:
                    item.update(page_detail)
                    enriched_count += 1
            search_data = {"web": {"results": merged_results}}
    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Layanan pencarian internet atau peta sedang tidak tersedia.") from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Gagal mengambil referensi pasar dari internet.") from exc

    all_results = search_data.get("web", {}).get("results", [])
    individual_results = [item for item in all_results if _is_individual_land_listing(item)]
    # Prefer individual listing pages exclusively whenever the index has them.
    results = individual_results or all_results
    unit_price_observations = _extract_unit_prices(results)
    market_summary = _summarize_unit_prices(unit_price_observations)
    market_summary["price_conclusion"] = market_summary["conclusion"]
    market_summary["area_implication"] = area_context["price_implication"]
    market_summary["conclusion"] = f"{market_summary['conclusion']} Pertimbangan kondisi areal: {area_context['price_implication']}"
    return {
        "location": {
            "lat": lat,
            "lon": lon,
            "area": area,
            "street": street,
            "display_name": location_data.get("display_name", area),
        },
        "search_criteria": {
            "land_type": land_type,
            "land_shape": land_shape,
            "street": street,
            "street_search_used": bool(street_search_area),
            "query_used": locality_queries_used[0]["level"] if locality_queries_used else "Bali",
            "locality_queries": locality_queries_used,
            "detail_queries": detail_queries_used,
            "detail_pages_enriched": enriched_count,
            "facebook_queries_used": facebook_queries_used,
            "reference_scope": "individual listings" if individual_results else "portal search pages (no individual listings indexed for this query)",
        },
        "area_context": area_context,
        "references": [
            {
                "title": item.get("title", "Referensi harga tanah"),
                "url": item.get("url"),
                "description": _plain_text(item.get("description", "")),
                "source": item.get("meta_url", {}).get("hostname", "Sumber internet"),
                "price_mentions": PRICE_PATTERN.findall(item.get("title", "") + " " + item.get("description", "")),
                "matched_locality_level": item.get("matched_locality_level", "Bali"),
                "matched_locality_area": item.get("matched_locality_area", area),
                "reference_kind": "individual_listing" if _is_individual_land_listing(item) else "search_page",
                **_extract_listing_summary(item),
            }
            for item in results
            if item.get("url")
        ],
        "facebook_public_result_count": sum(
            1 for item in results if "facebook.com" in item.get("url", "").lower()
        ),
        "market_summary": market_summary,
        "unit_price_observations": unit_price_observations,
        "note": "Harga pada halaman sumber adalah harga penawaran dan perlu diverifikasi. Referensi web bukan data transaksi terverifikasi. Konversi per are/per m² hanya dihitung bila kutipan menyebutkan satuannya secara eksplisit.",
    }
