from datetime import datetime, date, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Enum, Boolean, Text, JSON, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.agunan import LegalitasTanah, BentukTanah, JenisProperti


class SumberData(str, enum.Enum):
    LELANG = "LELANG"
    APPRAISAL_KJPP = "APPRAISAL_KJPP"
    APPRAISAL_INTERNAL = "APPRAISAL_INTERNAL"
    SURVEI = "SURVEI"
    LISTING = "LISTING"


class JenisHarga(str, enum.Enum):
    TRANSAKSI = "TRANSAKSI"
    PENAWARAN = "PENAWARAN"
    LIKUIDASI = "LIKUIDASI"
    NILAI_PASAR = "NILAI_PASAR"


class KualitasGeocode(str, enum.Enum):
    SANGAT_AKURAT = "SANGAT_AKURAT"
    AKURAT = "AKURAT"
    ESTIMASI = "ESTIMASI"
    KELURAHAN = "KELURAHAN"


class Pembanding(Base):
    __tablename__ = "pembanding"

    id = Column(Integer, primary_key=True, index=True)
    kode_referensi = Column(String(50), unique=True, index=True, nullable=False)
    sumber = Column(Enum(SumberData), nullable=False)
    jenis_harga = Column(Enum(JenisHarga), default=JenisHarga.TRANSAKSI, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    alamat = Column(Text, nullable=False)
    kota_kabupaten = Column(String(100), nullable=False)
    provinsi = Column(String(100), nullable=False)
    luas_tanah = Column(Float, nullable=False)  # dalam m2
    harga_total = Column(Float, nullable=False)  # dalam Rupiah
    harga_per_m2 = Column(Float, nullable=False)  # harga_total / luas_tanah
    tanggal_data = Column(Date, nullable=False)
    legalitas = Column(Enum(LegalitasTanah), default=LegalitasTanah.SHM, nullable=False)
    lebar_jalan = Column(Float, nullable=False)  # dalam meter
    bentuk_tanah = Column(Enum(BentukTanah), default=BentukTanah.PERSEGI, nullable=False)
    jenis_properti = Column(Enum(JenisProperti), default=JenisProperti.TANAH, nullable=False)
    kualitas_geocode = Column(Enum(KualitasGeocode), default=KualitasGeocode.AKURAT, nullable=False)
    status_valid = Column(Boolean, default=True, nullable=False)
    catatan = Column(Text, nullable=True)
    atribut_lain = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    valuasi_pembanding_list = relationship("ValuasiPembanding", back_populates="pembanding")

    # Composite Indexes
    __table_args__ = (
        Index("idx_pembanding_lat_lon", "lat", "lon"),
        Index("idx_pembanding_filter", "jenis_properti", "status_valid", "tanggal_data"),
    )
