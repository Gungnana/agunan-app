from typing import Dict, Any, Optional
from datetime import date, datetime
from pydantic import BaseModel, Field


class ParameterValuasiBase(BaseModel):
    versi: str = Field(..., description="Kode versi parameter, contoh: 'v1.1-SPI-2026'")
    judul: str = Field(..., description="Deskripsi judul parameter")
    berlaku_dari: date
    aktif: bool = True
    parameter_json: Dict[str, Any] = Field(..., description="Objek JSON parameter valuasi lengkap")


class ParameterValuasiCreate(ParameterValuasiBase):
    pass


class ParameterValuasiUpdate(BaseModel):
    judul: Optional[str] = None
    berlaku_dari: Optional[date] = None
    aktif: Optional[bool] = None
    parameter_json: Optional[Dict[str, Any]] = None


class ParameterValuasiResponse(ParameterValuasiBase):
    id: int
    created_at: datetime
    created_by: str

    class Config:
        from_attributes = True
