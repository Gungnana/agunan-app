import logging
from datetime import date, timedelta
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.parameter import ParameterValuasi
from app.models.pengajuan import Pengajuan, PengajuanStatus
from app.models.agunan import Agunan, LegalitasTanah, BentukTanah, JenisProperti
from app.models.pembanding import Pembanding, SumberData, JenisHarga, KualitasGeocode

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("init_db")


DEFAULT_PARAMETERS = {
    "diskon_penawaran_pct": 0.08,
    "haircut_likuidasi_pct": 0.30,
    "penyesuaian_waktu": {
        "inflasi_tahunan_pct": 0.04,
    },
    "penyesuaian_lokasi": {
        "faktor_jarak_per_km_pct": -0.02,
    },
    "penyesuaian_luas": {
        "elastisitas_luas": 0.15,
    },
    "penyesuaian_lebar_jalan": {
        "faktor_per_meter_pct": 0.03,
    },
    "bobot_bentuk_tanah": {
        "PERSEGI": 0.00,
        "PERSEGI_PANJANG": -0.02,
        "KANTONG_SEMAR": 0.04,
        "TIDAK_BERATURAN": -0.08,
        "L": -0.05,
    },
    "bobot_legalitas": {
        "SHM": 0.00,
        "HGB": -0.05,
        "GIRIK": -0.15,
        "LAINNYA": -0.20,
    },
    "bobot_sumber_data": {
        "LELANG": 1.0,
        "APPRAISAL_KJPP": 0.9,
        "APPRAISAL_INTERNAL": 0.8,
        "SURVEI": 0.7,
        "LISTING": 0.4,
    },
    "bobot_kriteria_skor": {
        "jarak": 0.30,
        "luas": 0.25,
        "waktu": 0.20,
        "legalitas": 0.15,
        "lebar_jalan": 0.10,
    },
}


def init_database():
    """Inisialisasi tabel dan data awal (seeding) sistem perbankan."""
    logger.info("Membuat struktur tabel database...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed Pengguna Awal
        admin = db.query(User).filter(User.username == settings.INITIAL_ADMIN_USERNAME).first()
        if not admin and settings.INITIAL_ADMIN_PASSWORD:
            admin = User(
                username=settings.INITIAL_ADMIN_USERNAME,
                email=settings.INITIAL_ADMIN_EMAIL,
                full_name=settings.INITIAL_ADMIN_FULLNAME,
                hashed_password=get_password_hash(settings.INITIAL_ADMIN_PASSWORD),
                role=UserRole.ANALIS,
                is_active=True,
            )
            db.add(admin)

        analis = db.query(User).filter(User.username == settings.INITIAL_ANALIS_USERNAME).first()
        if not analis and settings.INITIAL_ANALIS_PASSWORD:
            analis = User(
                username=settings.INITIAL_ANALIS_USERNAME,
                email=settings.INITIAL_ANALIS_EMAIL,
                full_name=settings.INITIAL_ANALIS_FULLNAME,
                hashed_password=get_password_hash(settings.INITIAL_ANALIS_PASSWORD),
                role=UserRole.ANALIS,
                is_active=True,
            )
            db.add(analis)

        # Reviewer role removed — only ANALIS role exists

        db.commit()
        if analis:
            db.refresh(analis)

        # 2. Seed Parameter Valuasi Aktif
        param = db.query(ParameterValuasi).filter(ParameterValuasi.versi == "v1.0-SPI-2026").first()
        if not param:
            param = ParameterValuasi(
                versi="v1.0-SPI-2026",
                judul="Parameter Valuasi Agunan Tanah SPI 2026",
                berlaku_dari=date.today(),
                aktif=True,
                parameter_json=DEFAULT_PARAMETERS,
                created_by="SYSTEM",
            )
            db.add(param)
            db.commit()

        # 3. Seed Pengajuan Kredit dan Agunan Contoh
        pengajuan = db.query(Pengajuan).filter(Pengajuan.nomor_pengajuan == "PJ-2026-00101").first()
        if not pengajuan and analis:
            pengajuan = Pengajuan(
                nomor_pengajuan="PJ-2026-00101",
                nama_debitur="PT Sumber Makmur Sejahtera",
                cif="CIF-8829104",
                plafon_diajukan=3500000000.0,
                jenis_kredit="Kredit Modal Kerja",
                status=PengajuanStatus.PROSES_ANALISA,
                analyst_id=analis.id,
                reviewer_id=None,
            )
            db.add(pengajuan)
            db.commit()
            db.refresh(pengajuan)

            # Agunan Tanah di Tebet, Jakarta Selatan
            # Koordinat Tebet: -6.2383, 106.8528
            agunan1 = Agunan(
                pengajuan_id=pengajuan.id,
                kode_agunan="AGN-TEBET-001",
                jenis_properti=JenisProperti.TANAH,
                lat=-6.2383,
                lon=106.8528,
                alamat="Jl. Tebet Timur Dalam Raya No. 42",
                kelurahan="Tebet Timur",
                kecamatan="Tebet",
                kota_kabupaten="Jakarta Selatan",
                provinsi="DKI Jakarta",
                luas_tanah=250.0,
                legalitas=LegalitasTanah.SHM,
                lebar_jalan=6.0,
                bentuk_tanah=BentukTanah.PERSEGI,
                nilai_perolehan=3000000000.0,
            )
            db.add(agunan1)

            # Pengajuan 2: Bandung
            pengajuan2 = Pengajuan(
                nomor_pengajuan="PJ-2026-00102",
                nama_debitur="CV Anugerah Citra Mandiri",
                cif="CIF-9182374",
                plafon_diajukan=1800000000.0,
                jenis_kredit="Kredit Investasi",
                status=PengajuanStatus.PROSES_ANALISA,
                analyst_id=analis.id,
                reviewer_id=None,
            )
            db.add(pengajuan2)
            db.commit()
            db.refresh(pengajuan2)

            agunan2 = Agunan(
                pengajuan_id=pengajuan2.id,
                kode_agunan="AGN-BDG-002",
                jenis_properti=JenisProperti.TANAH,
                lat=-6.8905,
                lon=107.6105,
                alamat="Jl. Dago Asri No. 15",
                kelurahan="Dago",
                kecamatan="Coblong",
                kota_kabupaten="Kota Bandung",
                provinsi="Jawa Barat",
                luas_tanah=320.0,
                legalitas=LegalitasTanah.SHM,
                lebar_jalan=7.0,
                bentuk_tanah=BentukTanah.PERSEGI_PANJANG,
                nilai_perolehan=2200000000.0,
            )
            db.add(agunan2)
            db.commit()

        # 4. Seed Data Pembanding Realistis di Sekitar Tebet Jakarta Selatan
        existing_comp = db.query(Pembanding).first()
        if not existing_comp:
            today = date.today()
            # Pembanding di sekitar Tebet (-6.2383, 106.8528)
            tebet_comparables = [
                # Radius ~250m
                {
                    "kode_referensi": "CMP-TBT-001",
                    "sumber": SumberData.APPRAISAL_KJPP,
                    "jenis_harga": JenisHarga.NILAI_PASAR,
                    "lat": -6.2395,
                    "lon": 106.8535,
                    "alamat": "Jl. Tebet Timur Dalam VI No. 8",
                    "kota_kabupaten": "Jakarta Selatan",
                    "provinsi": "DKI Jakarta",
                    "luas_tanah": 240.0,
                    "harga_total": 3600000000.0,
                    "harga_per_m2": 15000000.0,
                    "tanggal_data": today - timedelta(days=45),
                    "legalitas": LegalitasTanah.SHM,
                    "lebar_jalan": 6.0,
                    "bentuk_tanah": BentukTanah.PERSEGI,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.SANGAT_AKURAT,
                    "status_valid": True,
                    "catatan": "Hasil penilaian appraisal KJPP rekanan bank untuk lelang",
                },
                # Radius ~450m
                {
                    "kode_referensi": "CMP-TBT-002",
                    "sumber": SumberData.APPRAISAL_INTERNAL,
                    "jenis_harga": JenisHarga.TRANSAKSI,
                    "lat": -6.2365,
                    "lon": 106.8515,
                    "alamat": "Jl. Tebet Barat Dalam Raya No. 12",
                    "kota_kabupaten": "Jakarta Selatan",
                    "provinsi": "DKI Jakarta",
                    "luas_tanah": 260.0,
                    "harga_total": 4030000000.0,
                    "harga_per_m2": 15500000.0,
                    "tanggal_data": today - timedelta(days=90),
                    "legalitas": LegalitasTanah.SHM,
                    "lebar_jalan": 7.0,
                    "bentuk_tanah": BentukTanah.PERSEGI_PANJANG,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.AKURAT,
                    "status_valid": True,
                    "catatan": "Data agunan lunas fasilitas KPR Internal",
                },
                # Radius ~700m
                {
                    "kode_referensi": "CMP-TBT-003",
                    "sumber": SumberData.SURVEI,
                    "jenis_harga": JenisHarga.TRANSAKSI,
                    "lat": -6.2420,
                    "lon": 106.8560,
                    "alamat": "Jl. Tebet Barat IX No. 20",
                    "kota_kabupaten": "Jakarta Selatan",
                    "provinsi": "DKI Jakarta",
                    "luas_tanah": 220.0,
                    "harga_total": 3190000000.0,
                    "harga_per_m2": 14500000.0,
                    "tanggal_data": today - timedelta(days=120),
                    "legalitas": LegalitasTanah.SHM,
                    "lebar_jalan": 5.0,
                    "bentuk_tanah": BentukTanah.PERSEGI,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.AKURAT,
                    "status_valid": True,
                    "catatan": "Survei lapangan konfirmasi ke Ketua RT setempat",
                },
                # Radius ~850m (Listing perlu diskon penawaran)
                {
                    "kode_referensi": "CMP-TBT-004",
                    "sumber": SumberData.LISTING,
                    "jenis_harga": JenisHarga.PENAWARAN,
                    "lat": -6.2440,
                    "lon": 106.8490,
                    "alamat": "Jl. Tebet Raya Kavling 3B",
                    "kota_kabupaten": "Jakarta Selatan",
                    "provinsi": "DKI Jakarta",
                    "luas_tanah": 280.0,
                    "harga_total": 4620000000.0,
                    "harga_per_m2": 16500000.0,
                    "tanggal_data": today - timedelta(days=30),
                    "legalitas": LegalitasTanah.SHM,
                    "lebar_jalan": 8.0,
                    "bentuk_tanah": BentukTanah.PERSEGI,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.AKURAT,
                    "status_valid": True,
                    "catatan": "Listing portal properti terverifikasi agen",
                },
                # Radius ~1.1km (Lelang Eksekusi Hak Tanggungan)
                {
                    "kode_referensi": "CMP-TBT-005",
                    "sumber": SumberData.LELANG,
                    "jenis_harga": JenisHarga.TRANSAKSI,
                    "lat": -6.2305,
                    "lon": 106.8570,
                    "alamat": "Jl. Dr. Saharjo Gang Swadaya No. 4",
                    "kota_kabupaten": "Jakarta Selatan",
                    "provinsi": "DKI Jakarta",
                    "luas_tanah": 210.0,
                    "harga_total": 2940000000.0,
                    "harga_per_m2": 14000000.0,
                    "tanggal_data": today - timedelta(days=180),
                    "legalitas": LegalitasTanah.SHM,
                    "lebar_jalan": 5.0,
                    "bentuk_tanah": BentukTanah.TIDAK_BERATURAN,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.SANGAT_AKURAT,
                    "status_valid": True,
                    "catatan": "Risalah Lelang KPKNL Jakarta IV",
                },
                # Radius ~1.4km
                {
                    "kode_referensi": "CMP-TBT-006",
                    "sumber": SumberData.APPRAISAL_KJPP,
                    "jenis_harga": JenisHarga.NILAI_PASAR,
                    "lat": -6.2480,
                    "lon": 106.8580,
                    "alamat": "Jl. Pancoran Barat XI No. 18",
                    "kota_kabupaten": "Jakarta Selatan",
                    "provinsi": "DKI Jakarta",
                    "luas_tanah": 300.0,
                    "harga_total": 4350000000.0,
                    "harga_per_m2": 14500000.0,
                    "tanggal_data": today - timedelta(days=60),
                    "legalitas": LegalitasTanah.HGB,
                    "lebar_jalan": 6.0,
                    "bentuk_tanah": BentukTanah.PERSEGI_PANJANG,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.AKURAT,
                    "status_valid": True,
                    "catatan": "KJPP Muttaqin Bambang Purwanto Rozak",
                },
            ]

            # Pembanding di sekitar Bandung (-6.8905, 107.6105)
            bandung_comparables = [
                {
                    "kode_referensi": "CMP-BDG-001",
                    "sumber": SumberData.APPRAISAL_KJPP,
                    "jenis_harga": JenisHarga.NILAI_PASAR,
                    "lat": -6.8915,
                    "lon": 107.6115,
                    "alamat": "Jl. Dago Barat No. 12",
                    "kota_kabupaten": "Kota Bandung",
                    "provinsi": "Jawa Barat",
                    "luas_tanah": 310.0,
                    "harga_total": 2790000000.0,
                    "harga_per_m2": 9000000.0,
                    "tanggal_data": today - timedelta(days=40),
                    "legalitas": LegalitasTanah.SHM,
                    "lebar_jalan": 7.0,
                    "bentuk_tanah": BentukTanah.PERSEGI,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.SANGAT_AKURAT,
                    "status_valid": True,
                    "catatan": "Penilaian Agunan Cabang Dago",
                },
                {
                    "kode_referensi": "CMP-BDG-002",
                    "sumber": SumberData.APPRAISAL_INTERNAL,
                    "jenis_harga": JenisHarga.TRANSAKSI,
                    "lat": -6.8890,
                    "lon": 107.6090,
                    "alamat": "Jl. Kanayakan No. 4",
                    "kota_kabupaten": "Kota Bandung",
                    "provinsi": "Jawa Barat",
                    "luas_tanah": 330.0,
                    "harga_total": 2871000000.0,
                    "harga_per_m2": 8700000.0,
                    "tanggal_data": today - timedelta(days=80),
                    "legalitas": LegalitasTanah.SHM,
                    "lebar_jalan": 6.0,
                    "bentuk_tanah": BentukTanah.PERSEGI_PANJANG,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.AKURAT,
                    "status_valid": True,
                    "catatan": "Taksasi agunan kredit komersial",
                },
                {
                    "kode_referensi": "CMP-BDG-003",
                    "sumber": SumberData.SURVEI,
                    "jenis_harga": JenisHarga.TRANSAKSI,
                    "lat": -6.8920,
                    "lon": 107.6080,
                    "alamat": "Jl. Cisitu Lama No. 28",
                    "kota_kabupaten": "Kota Bandung",
                    "provinsi": "Jawa Barat",
                    "luas_tanah": 290.0,
                    "harga_total": 2465000000.0,
                    "harga_per_m2": 8500000.0,
                    "tanggal_data": today - timedelta(days=100),
                    "legalitas": LegalitasTanah.SHM,
                    "lebar_jalan": 6.0,
                    "bentuk_tanah": BentukTanah.PERSEGI,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.AKURAT,
                    "status_valid": True,
                    "catatan": "Survei lapangan aparat kelurahan Dago",
                },
                {
                    "kode_referensi": "CMP-BDG-004",
                    "sumber": SumberData.LISTING,
                    "jenis_harga": JenisHarga.PENAWARAN,
                    "lat": -6.8870,
                    "lon": 107.6130,
                    "alamat": "Jl. Tubagus Ismail Kav. 7",
                    "kota_kabupaten": "Kota Bandung",
                    "provinsi": "Jawa Barat",
                    "luas_tanah": 350.0,
                    "harga_total": 3325000000.0,
                    "harga_per_m2": 9500000.0,
                    "tanggal_data": today - timedelta(days=20),
                    "legalitas": LegalitasTanah.SHM,
                    "lebar_jalan": 8.0,
                    "bentuk_tanah": BentukTanah.PERSEGI,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.AKURAT,
                    "status_valid": True,
                    "catatan": "Listing penawaran pemilik langsung",
                },
                {
                    "kode_referensi": "CMP-BDG-005",
                    "sumber": SumberData.LELANG,
                    "jenis_harga": JenisHarga.TRANSAKSI,
                    "lat": -6.8950,
                    "lon": 107.6150,
                    "alamat": "Jl. Dipati Ukur No. 89",
                    "kota_kabupaten": "Kota Bandung",
                    "provinsi": "Jawa Barat",
                    "luas_tanah": 300.0,
                    "harga_total": 2640000000.0,
                    "harga_per_m2": 8800000.0,
                    "tanggal_data": today - timedelta(days=150),
                    "legalitas": LegalitasTanah.HGB,
                    "lebar_jalan": 10.0,
                    "bentuk_tanah": BentukTanah.PERSEGI_PANJANG,
                    "jenis_properti": JenisProperti.TANAH,
                    "kualitas_geocode": KualitasGeocode.SANGAT_AKURAT,
                    "status_valid": True,
                    "catatan": "Lelang KPKNL Bandung",
                },
            ]

            for c in tebet_comparables + bandung_comparables:
                db_item = Pembanding(**c)
                db.add(db_item)

            db.commit()

        logger.info("Inisialisasi database selesai dengan sukses.")
    except Exception as e:
        logger.error(f"Terjadi kesalahan saat inisialisasi database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
