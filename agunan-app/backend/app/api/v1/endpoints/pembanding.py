from typing import List, Optional
import tempfile
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.pembanding import Pembanding, SumberData, JenisHarga
from app.schemas.pembanding import PembandingCreate, PembandingResponse
from app.etl.import_internal import process_internal_data
from app.services.audit import log_audit_event

router = APIRouter()


@router.get("/", response_model=List[PembandingResponse])
def get_all_pembanding(
    sumber: Optional[SumberData] = None,
    jenis_harga: Optional[JenisHarga] = None,
    kota: Optional[str] = None,
    status_valid: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil database kanonik data harga tanah pembanding."""
    query = db.query(Pembanding)
    if sumber:
        query = query.filter(Pembanding.sumber == sumber)
    if jenis_harga:
        query = query.filter(Pembanding.jenis_harga == jenis_harga)
    if kota:
        query = query.filter(Pembanding.kota_kabupaten.ilike(f"%{kota}%"))
    if status_valid is not None:
        query = query.filter(Pembanding.status_valid == status_valid)

    return query.order_by(Pembanding.id.desc()).offset(skip).limit(limit).all()


@router.get("/{id}", response_model=PembandingResponse)
def get_pembanding_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil rincian data pembanding berdasarkan ID."""
    item = db.query(Pembanding).filter(Pembanding.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data pembanding tidak ditemukan.")
    return item


@router.post("/", response_model=PembandingResponse, status_code=status.HTTP_201_CREATED)
def create_pembanding(
    item_in: PembandingCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Menambahkan satu data pembanding pasar baru."""
    existing = db.query(Pembanding).filter(Pembanding.kode_referensi == item_in.kode_referensi).first()
    if existing:
        raise HTTPException(status_code=400, detail="Kode referensi pembanding sudah ada.")

    new_item = Pembanding(**item_in.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    log_audit_event(
        db,
        action="INPUT_PEMBANDING",
        user_id=current_user.id,
        entity_type="pembanding",
        entity_id=new_item.id,
        rincian={"kode_referensi": new_item.kode_referensi, "sumber": new_item.sumber.value, "harga_per_m2": new_item.harga_per_m2},
        request=request,
    )

    return new_item


@router.post("/import-internal")
async def upload_internal_data_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengimpor data agunan internal bank dalam bentuk file CSV atau Excel (.xlsx/.xls)
    melalui pipeline ETL import_internal.
    """
    if not (file.filename.endswith(".csv") or file.filename.endswith(".xlsx") or file.filename.endswith(".xls")):
        raise HTTPException(
            status_code=400,
            detail="Format file tidak didukung. Harap unggah file .csv atau .xlsx / .xls.",
        )

    # Simpan file sementara
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name

    try:
        summary = process_internal_data(tmp_path, db)

        log_audit_event(
            db,
            action="ETL_IMPORT_INTERNAL",
            user_id=current_user.id,
            entity_type="pembanding",
            rincian={"filename": file.filename, **summary},
            request=request,
        )

        return {
            "status": "SUKSES",
            "pesan": f"Berhasil memproses file {file.filename}.",
            "summary": summary,
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
