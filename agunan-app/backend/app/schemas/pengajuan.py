from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.pengajuan import PengajuanStatus


class PengajuanBase(BaseModel):
    nomor_pengajuan: str = Field(..., description="Nomor registrasi pengajuan kredit")
    nama_debitur: str = Field(..., description="Nama debitur")
    cif: str = Field(..., description="Customer Identification File")
    plafon_diajukan: float = Field(..., gt=0, description="Plafon kredit yang diajukan")
    jenis_kredit: str = Field(default="Kredit Modal Kerja")


class PengajuanCreate(PengajuanBase):
    reviewer_id: Optional[int] = None


class PengajuanUpdate(BaseModel):
    nama_debitur: Optional[str] = None
    plafon_diajukan: Optional[float] = None
    jenis_kredit: Optional[str] = None
    status: Optional[PengajuanStatus] = None
    reviewer_id: Optional[int] = None


class PengajuanResponse(PengajuanBase):
    id: int
    status: PengajuanStatus
    analyst_id: int
    reviewer_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
