from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.models.agunan import Agunan
from app.models.pengajuan import Pengajuan
from app.schemas.agunan import AgunanCreate, AgunanResponse, AgunanUpdate
from app.services.audit import log_audit_event

router = APIRouter()


@router.get("/", response_model=List[AgunanResponse])
def get_all_agunan(
    pengajuan_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil daftar agunan tanah. Bisa difilter per pengajuan_id."""
    query = db.query(Agunan)
    if pengajuan_id:
        query = query.filter(Agunan.pengajuan_id == pengajuan_id)
    return query.order_by(Agunan.id.desc()).offset(skip).limit(limit).all()


@router.get("/{id}", response_model=AgunanResponse)
def get_agunan_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil rincian data agunan tanah berdasarkan ID."""
    item = db.query(Agunan).filter(Agunan.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data agunan tidak ditemukan.")
    return item


@router.post("/", response_model=AgunanResponse, status_code=status.HTTP_201_CREATED)
def create_agunan(
    agunan_in: AgunanCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mendaftarkan data agunan tanah baru yang terkait dengan pengajuan kredit."""
    pengajuan = db.query(Pengajuan).filter(Pengajuan.id == agunan_in.pengajuan_id).first()
    if not pengajuan:
        raise HTTPException(status_code=404, detail="Pengajuan kredit terkait tidak ditemukan.")

    existing = db.query(Agunan).filter(Agunan.kode_agunan == agunan_in.kode_agunan).first()
    if existing:
        raise HTTPException(status_code=400, detail="Kode agunan sudah terdaftar.")

    new_item = Agunan(**agunan_in.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    log_audit_event(
        db,
        action="INPUT_AGUNAN",
        user_id=current_user.id,
        entity_type="agunan",
        entity_id=new_item.id,
        rincian={
            "kode_agunan": new_item.kode_agunan,
            "lat": new_item.lat,
            "lon": new_item.lon,
            "luas_tanah": new_item.luas_tanah,
            "legalitas": new_item.legalitas.value,
        },
        request=request,
    )

    return new_item


@router.put("/{id}", response_model=AgunanResponse)
def update_agunan(
    id: int,
    agunan_in: AgunanUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Memperbarui informasi agunan tanah (koordinat, luas, bentuk, legalitas)."""
    item = db.query(Agunan).filter(Agunan.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data agunan tidak ditemukan.")

    update_data = agunan_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(item, field, val)

    db.commit()
    db.refresh(item)

    log_audit_event(
        db,
        action="UPDATE_AGUNAN",
        user_id=current_user.id,
        entity_type="agunan",
        entity_id=item.id,
        rincian=update_data,
        request=request,
    )

    return item
