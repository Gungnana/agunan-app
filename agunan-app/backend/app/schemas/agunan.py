from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.models.agunan import LegalitasTanah, BentukTanah, JenisProperti
from app.services.geo import validate_indonesia_coordinates


class AgunanBase(BaseModel):
    pengajuan_id: int
    kode_agunan: str = Field(..., description="Kode registrasi agunan")
    jenis_properti: JenisProperti = JenisProperti.TANAH
    lat: float = Field(..., description="Garis lintang (Latitude)")
    lon: float = Field(..., description="Garis bujur (Longitude)")
    alamat: str = Field(..., min_length=5, description="Alamat lengkap lokasi tanah agunan")
    kelurahan: Optional[str] = None
    kecamatan: Optional[str] = None
    kota_kabupaten: str = Field(..., min_length=2)
    provinsi: str = Field(..., min_length=2)
    luas_tanah: float = Field(..., gt=0, description="Luas tanah dalam meter persegi (m²)")
    legalitas: LegalitasTanah = LegalitasTanah.SHM
    lebar_jalan: float = Field(..., gt=0, description="Lebar jalan akses di depan lokasi dalam meter")
    bentuk_tanah: BentukTanah = BentukTanah.PERSEGI
    nilai_perolehan: Optional[float] = None

    @field_validator("lat")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (-11.0 <= v <= 6.0):
            raise ValueError(f"Latitude ({v}) berada di luar batas wilayah kedaulatan Indonesia (-11.0 s/d 6.0).")
        return v

    @field_validator("lon")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (95.0 <= v <= 141.0):
            raise ValueError(f"Longitude ({v}) berada di luar batas wilayah kedaulatan Indonesia (95.0 s/d 141.0).")
        return v


class AgunanCreate(AgunanBase):
    pass


class AgunanUpdate(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    alamat: Optional[str] = None
    kota_kabupaten: Optional[str] = None
    provinsi: Optional[str] = None
    luas_tanah: Optional[float] = None
    legalitas: Optional[LegalitasTanah] = None
    lebar_jalan: Optional[float] = None
    bentuk_tanah: Optional[BentukTanah] = None
    nilai_perolehan: Optional[float] = None


class AgunanResponse(AgunanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
