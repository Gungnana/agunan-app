from typing import List, Dict, Any, Optional
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator
from app.models.valuasi import ValuasiStatus


class ValuasiAnalisaRequest(BaseModel):
    agunan_id: int = Field(..., description="ID Agunan yang akan dianalisa")
    parameter_id: Optional[int] = Field(None, description="Opsional ID parameter khusus, default memakai parameter aktif")
    reference_date: Optional[date] = Field(None, description="Opsional tanggal referensi penilaian, default hari ini")


class ValuasiOverrideRequest(BaseModel):
    selected_pembanding_ids: List[int] = Field(..., min_length=2, max_length=3, description="Daftar 2-3 ID pembanding pilihan analis")
    alasan: str = Field(..., min_length=10, description="Alasan profesional analis kredit memilih pembanding pengganti (min 10 karakter)")

    @field_validator("alasan")
    @classmethod
    def validate_alasan_length(cls, v: str) -> str:
        trimmed = v.strip()
        if len(trimmed) < 10:
            raise ValueError("Alasan override wajib diisi dengan minimal 10 karakter yang jelas.")
        return trimmed


class ValuasiPembandingDetail(BaseModel):
    id: Optional[int] = None
    pembanding_id: int
    kode_referensi: Optional[str] = None
    sumber: Optional[str] = None
    jenis_harga: Optional[str] = None
    alamat: Optional[str] = None
    luas_tanah: Optional[float] = None
    harga_asli_per_m2: float
    harga_cleansed_per_m2: float
    faktor_diskon_penawaran: float
    total_penyesuaian_pct: float
    rincian_penyesuaian_json: Dict[str, Any]
    harga_adjusted_per_m2: float
    jarak_meter: float
    skor_kemiripan: float
    bobot_sumber: float
    skor_akhir: float
    bobot_kontribusi: float
    is_override: bool = False
    alasan_override: Optional[str] = None
    urutan: int = 1

    class Config:
        from_attributes = True


class ValuasiResponse(BaseModel):
    id: int
    agunan_id: int
    user_id: int
    parameter_id: int
    status: ValuasiStatus
    estimasi_per_m2: Optional[float] = None
    nilai_pasar: Optional[float] = None
    rentang_min: Optional[float] = None
    rentang_max: Optional[float] = None
    nilai_likuidasi: Optional[float] = None
    haircut_persen: Optional[float] = None
    confidence_score: Optional[float] = None
    radius_efektif_meter: Optional[int] = None
    jumlah_kandidat: int = 0
    jumlah_pembanding_dipakai: int = 0
    versi_algoritma: str
    catatan_analis: Optional[str] = None
    snapshot_json: Dict[str, Any]
    selected_pembanding: List[ValuasiPembandingDetail] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
