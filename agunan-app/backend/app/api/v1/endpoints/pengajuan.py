from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.pengajuan import Pengajuan
from app.schemas.pengajuan import PengajuanCreate, PengajuanResponse, PengajuanUpdate
from app.services.audit import log_audit_event

router = APIRouter()


@router.get("/", response_model=List[PengajuanResponse])
def get_all_pengajuan(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil daftar seluruh pengajuan kredit."""
    query = db.query(Pengajuan)
    if current_user.role == UserRole.ANALIS:
        # Analis melihat pengajuan miliknya atau semua pengajuan
        pass
    items = query.order_by(Pengajuan.id.desc()).offset(skip).limit(limit).all()
    return items


@router.get("/{id}", response_model=PengajuanResponse)
def get_pengajuan_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil rincian satu pengajuan kredit berdasarkan ID."""
    item = db.query(Pengajuan).filter(Pengajuan.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Pengajuan kredit tidak ditemukan.")
    return item


@router.post("/", response_model=PengajuanResponse, status_code=status.HTTP_201_CREATED)
def create_pengajuan(
    pengajuan_in: PengajuanCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Membuat registrasi pengajuan kredit baru."""
    existing = db.query(Pengajuan).filter(Pengajuan.nomor_pengajuan == pengajuan_in.nomor_pengajuan).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nomor pengajuan sudah terdaftar.")

    new_item = Pengajuan(
        nomor_pengajuan=pengajuan_in.nomor_pengajuan,
        nama_debitur=pengajuan_in.nama_debitur,
        cif=pengajuan_in.cif,
        plafon_diajukan=pengajuan_in.plafon_diajukan,
        jenis_kredit=pengajuan_in.jenis_kredit,
        analyst_id=current_user.id,
        reviewer_id=pengajuan_in.reviewer_id,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    log_audit_event(
        db,
        action="BUAT_PENGAJUAN",
        user_id=current_user.id,
        entity_type="pengajuan",
        entity_id=new_item.id,
        rincian={"nomor_pengajuan": new_item.nomor_pengajuan, "plafon": new_item.plafon_diajukan},
        request=request,
    )

    return new_item
