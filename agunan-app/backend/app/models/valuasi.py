from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class ValuasiStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    OVERRIDDEN = "OVERRIDDEN"
    DATA_TIDAK_CUKUP = "DATA_TIDAK_CUKUP"
    DRAFT = "DRAFT"


class Valuasi(Base):
    __tablename__ = "valuasi"

    id = Column(Integer, primary_key=True, index=True)
    agunan_id = Column(Integer, ForeignKey("agunan.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parameter_id = Column(Integer, ForeignKey("parameter_valuasi.id"), nullable=False)
    status = Column(Enum(ValuasiStatus), default=ValuasiStatus.COMPLETED, nullable=False)
    estimasi_per_m2 = Column(Float, nullable=True)
    nilai_pasar = Column(Float, nullable=True)
    rentang_min = Column(Float, nullable=True)
    rentang_max = Column(Float, nullable=True)
    nilai_likuidasi = Column(Float, nullable=True)
    haircut_persen = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)  # 0 - 100
    radius_efektif_meter = Column(Integer, nullable=True)
    jumlah_kandidat = Column(Integer, default=0, nullable=False)
    jumlah_pembanding_dipakai = Column(Integer, default=0, nullable=False)
    versi_algoritma = Column(String(50), default="v1.0.0-SPI", nullable=False)
    catatan_analis = Column(Text, nullable=True)
    snapshot_json = Column(JSON, nullable=False)  # Lengkap untuk audit ulang
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    agunan = relationship("Agunan", back_populates="valuasi_list")
    analyst = relationship("User", back_populates="valuasi_list")
    parameter = relationship("ParameterValuasi")
    pembanding_list = relationship("ValuasiPembanding", back_populates="valuasi", cascade="all, delete-orphan", order_by="ValuasiPembanding.urutan")


class ValuasiPembanding(Base):
    __tablename__ = "valuasi_pembanding"

    id = Column(Integer, primary_key=True, index=True)
    valuasi_id = Column(Integer, ForeignKey("valuasi.id"), nullable=False)
    pembanding_id = Column(Integer, ForeignKey("pembanding.id"), nullable=False)
    harga_asli_per_m2 = Column(Float, nullable=False)
    harga_cleansed_per_m2 = Column(Float, nullable=False)
    faktor_diskon_penawaran = Column(Float, default=0.0, nullable=False)
    total_penyesuaian_pct = Column(Float, nullable=False)  # Dalam desimal (contoh: +0.05 untuk +5%)
    rincian_penyesuaian_json = Column(JSON, nullable=False)  # Rincian penyesuaian waktu, lokasi, luas, dll
    harga_adjusted_per_m2 = Column(Float, nullable=False)
    jarak_meter = Column(Float, nullable=False)
    skor_kemiripan = Column(Float, nullable=False)
    bobot_sumber = Column(Float, nullable=False)
    skor_akhir = Column(Float, nullable=False)
    bobot_kontribusi = Column(Float, nullable=False)  # Bobot dalam perhitungan rata-rata tertimbang
    is_override = Column(Boolean, default=False, nullable=False)
    alasan_override = Column(Text, nullable=True)
    urutan = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    valuasi = relationship("Valuasi", back_populates="pembanding_list")
    pembanding = relationship("Pembanding", back_populates="valuasi_pembanding_list")
