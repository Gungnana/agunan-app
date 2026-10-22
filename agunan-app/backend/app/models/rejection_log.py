from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.core.database import Base


class RejectionLog(Base):
    __tablename__ = "rejection_logs"

    id = Column(Integer, primary_key=True, index=True)
    nik_npwp = Column(String(50), index=True, nullable=True)
    no_permohonan = Column(String(50), index=True, nullable=True)
    nama = Column(String(150), index=True, nullable=False)
    alamat = Column(String(255), nullable=True)
    tanggal_pengajuan = Column(String(20), nullable=True)
    plafon_pengajuan = Column(Float, nullable=False)
    jenis_kredit = Column(String(100), nullable=False)  # MODAL KERJA, INVESTASI, KONSUMTIF/MULTIGUNA, KPR, dll.
    peruntukan_kredit = Column(String(255), nullable=True)  # REFINANCING KREDIT, PEMBIAYAAN PROJECT, TAMBAHAN MODAL, dll.
    alasan_ditolak = Column(Text, nullable=False)  # Alasan detail penolakan
    kapasitas = Column(String(50), default="TOLAK", nullable=False)  # TOLAK, DITERIMA, DIPERTIMBANGKAN, BATAL PENGAJUAN
    jaminan = Column(String(100), default="SHM", nullable=True)  # SHM, SHM & BPKB, dll.
    informasi_negatif = Column(Text, nullable=True)  # Catatan informasi negatif
    kantor = Column(String(100), default="KPO", nullable=True)  # Kuta, KPO, dll.
    kepala_cabang = Column(String(100), nullable=True)
    analis = Column(String(100), nullable=True)
    tanggal_ditolak = Column(String(20), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
