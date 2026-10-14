from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class LegalitasTanah(str, enum.Enum):
    SHM = "SHM"
    HGB = "HGB"
    GIRIK = "GIRIK"
    LAINNYA = "LAINNYA"


class BentukTanah(str, enum.Enum):
    PERSEGI = "PERSEGI"
    PERSEGI_PANJANG = "PERSEGI_PANJANG"
    KANTONG_SEMAR = "KANTONG_SEMAR"
    TIDAK_BERATURAN = "TIDAK_BERATURAN"
    L = "L"


class JenisProperti(str, enum.Enum):
    TANAH = "TANAH"
    TANAH_BANGUNAN = "TANAH_BANGUNAN"


class Agunan(Base):
    __tablename__ = "agunan"

    id = Column(Integer, primary_key=True, index=True)
    pengajuan_id = Column(Integer, ForeignKey("pengajuan.id"), nullable=False)
    kode_agunan = Column(String(50), unique=True, index=True, nullable=False)
    jenis_properti = Column(Enum(JenisProperti), default=JenisProperti.TANAH, nullable=False)
    lat = Column(Float, nullable=False, index=True)
    lon = Column(Float, nullable=False, index=True)
    alamat = Column(Text, nullable=False)
    kelurahan = Column(String(100), nullable=True)
    kecamatan = Column(String(100), nullable=True)
    kota_kabupaten = Column(String(100), nullable=False)
    provinsi = Column(String(100), nullable=False)
    luas_tanah = Column(Float, nullable=False)  # dalam m2
    legalitas = Column(Enum(LegalitasTanah), default=LegalitasTanah.SHM, nullable=False)
    lebar_jalan = Column(Float, nullable=False)  # dalam meter
    bentuk_tanah = Column(Enum(BentukTanah), default=BentukTanah.PERSEGI, nullable=False)
    nilai_perolehan = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    pengajuan = relationship("Pengajuan", back_populates="agunan_list")
    valuasi_list = relationship("Valuasi", back_populates="agunan", cascade="all, delete-orphan")
