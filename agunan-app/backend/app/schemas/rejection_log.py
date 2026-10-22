from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict


class RejectionLogBase(BaseModel):
    nik_npwp: Optional[str] = None
    no_permohonan: Optional[str] = None
    nama: str
    alamat: Optional[str] = None
    tanggal_pengajuan: Optional[str] = None
    plafon_pengajuan: float
    jenis_kredit: str  # MODAL KERJA, INVESTASI, KONSUMTIF/MULTIGUNA, KPR, dll.
    peruntukan_kredit: Optional[str] = None  # REFINANCING KREDIT, PEMBIAYAAN PROJECT, dll.
    alasan_ditolak: str  # Alasan detail ditolak
    kapasitas: str = "TOLAK"  # TOLAK, DITERIMA, DIPERTIMBANGKAN, BATAL PENGAJUAN
    jaminan: Optional[str] = "SHM"  # SHM, SHM & BPKB, dll.
    informasi_negatif: Optional[str] = None
    kantor: Optional[str] = "KPO"
    kepala_cabang: Optional[str] = None
    analis: Optional[str] = None
    tanggal_ditolak: Optional[str] = None


class RejectionLogCreate(RejectionLogBase):
    pass


class RejectionLogUpdate(BaseModel):
    nik_npwp: Optional[str] = None
    no_permohonan: Optional[str] = None
    nama: Optional[str] = None
    alamat: Optional[str] = None
    tanggal_pengajuan: Optional[str] = None
    plafon_pengajuan: Optional[float] = None
    jenis_kredit: Optional[str] = None
    peruntukan_kredit: Optional[str] = None
    alasan_ditolak: Optional[str] = None
    kapasitas: Optional[str] = None
    jaminan: Optional[str] = None
    informasi_negatif: Optional[str] = None
    kantor: Optional[str] = None
    kepala_cabang: Optional[str] = None
    analis: Optional[str] = None
    tanggal_ditolak: Optional[str] = None


class RejectionLogResponse(RejectionLogBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RejectionStatsResponse(BaseModel):
    total_rejections: int
    total_plafon_ditolak: float
    by_kapasitas: Dict[str, int]
    by_jenis_kredit: Dict[str, int]
    by_kantor: Dict[str, int]
