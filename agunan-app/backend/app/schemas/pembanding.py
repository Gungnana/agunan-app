from typing import Optional, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field
from app.models.pembanding import SumberData, JenisHarga, KualitasGeocode
from app.models.agunan import LegalitasTanah, BentukTanah, JenisProperti


class PembandingBase(BaseModel):
    kode_referensi: str
    sumber: SumberData
    jenis_harga: JenisHarga = JenisHarga.TRANSAKSI
    lat: float
    lon: float
    alamat: str
    kota_kabupaten: str
    provinsi: str
    luas_tanah: float = Field(..., gt=0)
    harga_total: float = Field(..., gt=0)
    harga_per_m2: float = Field(..., gt=0)
    tanggal_data: date
    legalitas: LegalitasTanah = LegalitasTanah.SHM
    lebar_jalan: float = Field(..., gt=0)
    bentuk_tanah: BentukTanah = BentukTanah.PERSEGI
    jenis_properti: JenisProperti = JenisProperti.TANAH
    kualitas_geocode: KualitasGeocode = KualitasGeocode.AKURAT
    status_valid: bool = True
    catatan: Optional[str] = None
    atribut_lain: Optional[Dict[str, Any]] = None


class PembandingCreate(PembandingBase):
    pass


class PembandingResponse(PembandingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
