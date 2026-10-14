from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class PengajuanStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PROSES_ANALISA = "PROSES_ANALISA"
    MENUNGGU_REVIEW = "MENUNGGU_REVIEW"
    DISETUJUI = "DISETUJUI"
    DITOLAK = "DITOLAK"


class Pengajuan(Base):
    __tablename__ = "pengajuan"

    id = Column(Integer, primary_key=True, index=True)
    nomor_pengajuan = Column(String(50), unique=True, index=True, nullable=False)
    nama_debitur = Column(String(150), nullable=False)
    cif = Column(String(30), nullable=False)
    plafon_diajukan = Column(Float, nullable=False)
    jenis_kredit = Column(String(50), default="Kredit Modal Kerja", nullable=False)
    status = Column(Enum(PengajuanStatus), default=PengajuanStatus.PROSES_ANALISA, nullable=False)
    analyst_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    analyst = relationship("User", foreign_keys=[analyst_id], back_populates="pengajuan_analis")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="pengajuan_reviewer")
    agunan_list = relationship("Agunan", back_populates="pengajuan", cascade="all, delete-orphan")
