from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.parameter import ParameterValuasi
from app.schemas.parameter import (
    ParameterValuasiCreate,
    ParameterValuasiResponse,
    ParameterValuasiUpdate,
)
from app.services.audit import log_audit_event

router = APIRouter()


@router.get("/", response_model=List[ParameterValuasiResponse])
def get_all_parameter_versions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil riwayat seluruh versi parameter valuasi."""
    return db.query(ParameterValuasi).order_by(ParameterValuasi.id.desc()).all()


@router.get("/active", response_model=ParameterValuasiResponse)
def get_active_parameter(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil parameter valuasi yang saat ini berstatus aktif."""
    param = db.query(ParameterValuasi).filter(ParameterValuasi.aktif.is_(True)).order_by(ParameterValuasi.id.desc()).first()
    if not param:
        raise HTTPException(status_code=404, detail="Tidak ada parameter valuasi aktif.")
    return param


@router.post("/", response_model=ParameterValuasiResponse, status_code=status.HTTP_201_CREATED)
def create_parameter_version(
    param_in: ParameterValuasiCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Membuat versi parameter valuasi baru (Hanya ADMIN)."""
    existing = db.query(ParameterValuasi).filter(ParameterValuasi.versi == param_in.versi).first()
    if existing:
        raise HTTPException(status_code=400, detail="Versi parameter tersebut sudah ada.")

    # Jika diset aktif, nonaktifkan versi sebelumnya
    if param_in.aktif:
        db.query(ParameterValuasi).update({ParameterValuasi.aktif: False})

    new_param = ParameterValuasi(
        versi=param_in.versi,
        judul=param_in.judul,
        berlaku_dari=param_in.berlaku_dari,
        aktif=param_in.aktif,
        parameter_json=param_in.parameter_json,
        created_by=current_user.username,
    )
    db.add(new_param)
    db.commit()
    db.refresh(new_param)

    log_audit_event(
        db,
        action="BUAT_PARAMETER_VALUASI",
        user_id=current_user.id,
        entity_type="parameter_valuasi",
        entity_id=new_param.id,
        rincian={"versi": new_param.versi, "judul": new_param.judul},
        request=request,
    )

    return new_param


@router.put("/{id}/activate", response_model=ParameterValuasiResponse)
def activate_parameter_version(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengaktifkan versi parameter tertentu sebagai acuan mesin valuasi (Hanya ADMIN)."""
    param = db.query(ParameterValuasi).filter(ParameterValuasi.id == id).first()
    if not param:
        raise HTTPException(status_code=404, detail="Parameter tidak ditemukan.")

    # Nonaktifkan semua, aktifkan yang dipilih
    db.query(ParameterValuasi).update({ParameterValuasi.aktif: False})
    param.aktif = True
    db.commit()
    db.refresh(param)

    log_audit_event(
        db,
        action="AKTIFKAN_PARAMETER_VALUASI",
        user_id=current_user.id,
        entity_type="parameter_valuasi",
        entity_id=param.id,
        rincian={"versi_aktif": param.versi},
        request=request,
    )

    return param
