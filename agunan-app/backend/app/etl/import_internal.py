import argparse
import logging
import os
from datetime import date, datetime
from typing import Dict, Any, List, Optional
import pandas as pd
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.pembanding import Pembanding, SumberData, JenisHarga, KualitasGeocode
from app.models.agunan import LegalitasTanah, BentukTanah, JenisProperti
from app.services.geo import validate_indonesia_coordinates

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("import_internal")

# PII fields yang wajib diabaikan
IGNORED_PII_FIELDS = {
    "nama_debitur",
    "debitur",
    "cif",
    "no_rekening",
    "rekening",
    "nik",
    "npwp",
    "telepon",
    "no_hp",
}

# Koordinat perkiraan ibukota/kota besar di Indonesia jika lat/lon tidak tersedia
CITY_CENTROIDS = {
    "jakarta": (-6.2088, 106.8456),
    "jakarta selatan": (-6.2615, 106.8106),
    "jakarta pusat": (-6.1805, 106.8284),
    "jakarta barat": (-6.1683, 106.7588),
    "jakarta timur": (-6.2250, 106.9004),
    "jakarta utara": (-6.1384, 106.8640),
    "bandung": (-6.9175, 107.6191),
    "surabaya": (-7.2575, 112.7521),
    "semarang": (-6.9667, 110.4167),
    "medan": (3.5952, 98.6722),
    "makassar": (-5.1477, 119.4327),
    "denpasar": (-8.6705, 115.2126),
    "yogyakarta": (-7.7956, 110.3695),
}


def find_column_name(df_columns: List[str], candidates: List[str]) -> Optional[str]:
    """Mencari nama kolom dalam file yang cocok dengan variasi penamaan umum."""
    cols_lower = {str(c).strip().lower(): c for c in df_columns}
    for cand in candidates:
        if cand.lower() in cols_lower:
            return cols_lower[cand.lower()]
    return None


def normalize_legalitas(val: Any) -> LegalitasTanah:
    text_val = str(val).strip().upper()
    if "SHM" in text_val or "MILIK" in text_val:
        return LegalitasTanah.SHM
    elif "HGB" in text_val or "GUNA BANGUNAN" in text_val:
        return LegalitasTanah.HGB
    elif "GIRIK" in text_val or "AJB" in text_val or "PETOK" in text_val:
        return LegalitasTanah.GIRIK
    return LegalitasTanah.LAINNYA


def normalize_bentuk_tanah(val: Any) -> BentukTanah:
    text_val = str(val).strip().upper()
    if "KANTONG" in text_val:
        return BentukTanah.KANTONG_SEMAR
    elif "PANJANG" in text_val:
        return BentukTanah.PERSEGI_PANJANG
    elif "TIDAK" in text_val or "IRREGULAR" in text_val:
        return BentukTanah.TIDAK_BERATURAN
    elif " L" in text_val or text_val == "L":
        return BentukTanah.L
    return BentukTanah.PERSEGI


def process_internal_data(file_path: str, db: Session) -> Dict[str, Any]:
    """
    Memproses file CSV atau Excel data internal bank:
    1. Standarisasi kolom
    2. Menghapus field PII debitur
    3. Normalisasi harga per m2
    4. Geocoding quality evaluation & tagging data presisi rendah
    5. Penyimpanan ke tabel pembanding
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File tidak ditemukan: {file_path}")

    logger.info(f"Membaca file data internal: {file_path}")
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
    else:
        df = pd.read_excel(file_path)

    cols = list(df.columns)
    col_ref = find_column_name(cols, ["kode", "no_agunan", "nomor_agunan", "id_agunan", "kode_referensi", "reference_id"])
    col_alamat = find_column_name(cols, ["alamat", "lokasi", "alamat_agunan", "address"])
    col_kota = find_column_name(cols, ["kota", "kota_kabupaten", "kabupaten", "city"])
    col_prov = find_column_name(cols, ["provinsi", "propinsi", "province"])
    col_lat = find_column_name(cols, ["lat", "latitude", "lintang", "y"])
    col_lon = find_column_name(cols, ["lon", "lng", "longitude", "bujur", "x"])
    col_luas = find_column_name(cols, ["luas", "luas_tanah", "luas_m2", "lt", "land_area"])
    col_harga = find_column_name(cols, ["nilai_pasar", "harga", "harga_total", "nilai_taksasi", "nilai_agunan"])
    col_tgl = find_column_name(cols, ["tanggal", "tanggal_taksasi", "tanggal_penilaian", "tgl_data", "date"])
    col_leg = find_column_name(cols, ["legalitas", "status_hak", "bukti_hak"])
    col_jalan = find_column_name(cols, ["lebar_jalan", "akses_jalan", "road_width"])
    col_bentuk = find_column_name(cols, ["bentuk_tanah", "bentuk", "shape"])

    total_rows = len(df)
    imported_count = 0
    flagged_low_precision = 0
    skipped_count = 0

    for idx, row in df.iterrows():
        try:
            # 1. Luas dan Harga
            luas = float(row[col_luas]) if col_luas and pd.notna(row[col_luas]) else 0.0
            harga_total = float(row[col_harga]) if col_harga and pd.notna(row[col_harga]) else 0.0

            if luas <= 0 or harga_total <= 0:
                logger.warning(f"Baris {idx}: Luas ({luas}) atau harga ({harga_total}) tidak valid. Dilewati.")
                skipped_count += 1
                continue

            harga_per_m2 = round(harga_total / luas, 2)

            # 2. Lokasi & Geocoding Quality
            lat = float(row[col_lat]) if col_lat and pd.notna(row[col_lat]) else None
            lon = float(row[col_lon]) if col_lon and pd.notna(row[col_lon]) else None

            kualitas_geocode = KualitasGeocode.AKURAT
            status_valid = True

            kota = str(row[col_kota]).strip() if col_kota and pd.notna(row[col_kota]) else "Jakarta Selatan"
            provinsi = str(row[col_prov]).strip() if col_prov and pd.notna(row[col_prov]) else "DKI Jakarta"

            if lat is None or lon is None:
                # Coba fallback ke centroid kota
                city_key = kota.lower()
                centroid = CITY_CENTROIDS.get(city_key, CITY_CENTROIDS.get("jakarta"))
                lat, lon = centroid
                kualitas_geocode = KualitasGeocode.KELURAHAN
                flagged_low_precision += 1
            else:
                is_valid_coord, _ = validate_indonesia_coordinates(lat, lon)
                if not is_valid_coord:
                    status_valid = False
                    flagged_low_precision += 1

            # 3. Tanggal Data
            tgl_data = date.today()
            if col_tgl and pd.notna(row[col_tgl]):
                val_tgl = row[col_tgl]
                if isinstance(val_tgl, (datetime, pd.Timestamp)):
                    tgl_data = val_tgl.date()
                elif isinstance(val_tgl, str):
                    try:
                        tgl_data = datetime.fromisoformat(val_tgl[:10]).date()
                    except Exception:
                        tgl_data = date.today()

            # 4. Legalitas, Lebar Jalan, Bentuk
            legalitas = normalize_legalitas(row[col_leg]) if col_leg and pd.notna(row[col_leg]) else LegalitasTanah.SHM
            lebar_jalan = float(row[col_jalan]) if col_jalan and pd.notna(row[col_jalan]) else 5.0
            bentuk_tanah = normalize_bentuk_tanah(row[col_bentuk]) if col_bentuk and pd.notna(row[col_bentuk]) else BentukTanah.PERSEGI

            # 5. Kode Referensi unik
            ref_id = str(row[col_ref]).strip() if col_ref and pd.notna(row[col_ref]) else f"INT-{int(datetime.now().timestamp())}-{idx}"
            alamat = str(row[col_alamat]).strip() if col_alamat and pd.notna(row[col_alamat]) else f"Jl. Lokasi Internal No. {idx+1}"

            # Simpan ke tabel pembanding
            comp_item = Pembanding(
                kode_referensi=ref_id,
                sumber=SumberData.APPRAISAL_INTERNAL,
                jenis_harga=JenisHarga.TRANSAKSI,
                lat=lat,
                lon=lon,
                alamat=alamat,
                kota_kabupaten=kota,
                provinsi=provinsi,
                luas_tanah=luas,
                harga_total=harga_total,
                harga_per_m2=harga_per_m2,
                tanggal_data=tgl_data,
                legalitas=legalitas,
                lebar_jalan=lebar_jalan,
                bentuk_tanah=bentuk_tanah,
                jenis_properti=JenisProperti.TANAH,
                kualitas_geocode=kualitas_geocode,
                status_valid=status_valid,
                catatan="Data diimpor melalui ETL import_internal bank",
                atribut_lain={"sumber_etl": "import_internal.py", "baris_asli": idx},
            )
            db.add(comp_item)
            imported_count += 1

        except Exception as err:
            logger.error(f"Gagal memproses baris {idx}: {err}")
            skipped_count += 1

    db.commit()

    summary = {
        "total_baris": total_rows,
        "berhasil_diimpor": imported_count,
        "ditandai_presisi_rendah": flagged_low_precision,
        "dilewati": skipped_count,
    }
    logger.info(f"Hasil ETL Import: {summary}")
    return summary


def main():
    parser = argparse.ArgumentParser(description="ETL Import Data Agunan Internal Bank ke Tabel Pembanding")
    parser.add_argument("--file", type=str, required=True, help="Path ke file CSV atau Excel yang akan diimpor")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        process_internal_data(args.file, db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
