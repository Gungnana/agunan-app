from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.rejection_log import RejectionLog
from app.schemas.rejection_log import (
    RejectionLogCreate,
    RejectionLogUpdate,
    RejectionLogResponse,
    RejectionStatsResponse,
)

router = APIRouter()


@router.get("/stats", response_model=RejectionStatsResponse)
def get_rejection_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mendapatkan rekap statistik penolakan nasabah."""
    all_logs = db.query(RejectionLog).all()
    
    total_rejections = len(all_logs)
    total_plafon = sum(item.plafon_pengajuan for item in all_logs)
    
    by_kapasitas = {}
    by_jenis_kredit = {}
    by_kantor = {}
    
    for item in all_logs:
        kap = item.kapasitas or "TOLAK"
        by_kapasitas[kap] = by_kapasitas.get(kap, 0) + 1
        
        jk = item.jenis_kredit or "LAINNYA"
        by_jenis_kredit[jk] = by_jenis_kredit.get(jk, 0) + 1
        
        kt = item.kantor or "KPO"
        by_kantor[kt] = by_kantor.get(kt, 0) + 1
        
    return {
        "total_rejections": total_rejections,
        "total_plafon_ditolak": total_plafon,
        "by_kapasitas": by_kapasitas,
        "by_jenis_kredit": by_jenis_kredit,
        "by_kantor": by_kantor,
    }


@router.get("/", response_model=List[RejectionLogResponse])
def get_all_rejection_logs(
    skip: int = 0,
    limit: int = 200,
    q: Optional[str] = None,
    jenis_kredit: Optional[str] = None,
    kapasitas: Optional[str] = None,
    kantor: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil daftar logbook penolakan nasabah dengan filter pencarian."""
    query = db.query(RejectionLog)
    
    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                RejectionLog.nama.ilike(search_pattern),
                RejectionLog.nik_npwp.ilike(search_pattern),
                RejectionLog.no_permohonan.ilike(search_pattern),
                RejectionLog.alamat.ilike(search_pattern),
                RejectionLog.alasan_ditolak.ilike(search_pattern),
                RejectionLog.peruntukan_kredit.ilike(search_pattern),
            )
        )
        
    if jenis_kredit and jenis_kredit != "ALL":
        query = query.filter(RejectionLog.jenis_kredit == jenis_kredit)
        
    if kapasitas and kapasitas != "ALL":
        query = query.filter(RejectionLog.kapasitas == kapasitas)
        
    if kantor and kantor != "ALL":
        query = query.filter(RejectionLog.kantor == kantor)
        
    items = query.order_by(RejectionLog.id.asc()).offset(skip).limit(limit).all()
    return items


@router.get("/{id}", response_model=RejectionLogResponse)
def get_rejection_log_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mengambil detail catatan penolakan berdasarkan ID."""
    item = db.query(RejectionLog).filter(RejectionLog.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data logbook penolakan tidak ditemukan.")
    return item


@router.post("/", response_model=RejectionLogResponse, status_code=status.HTTP_201_CREATED)
def create_rejection_log(
    payload: RejectionLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Menambahkan catatan penolakan nasabah baru ke logbook."""
    new_item = RejectionLog(
        nik_npwp=payload.nik_npwp,
        no_permohonan=payload.no_permohonan,
        nama=payload.nama,
        alamat=payload.alamat,
        tanggal_pengajuan=payload.tanggal_pengajuan,
        plafon_pengajuan=payload.plafon_pengajuan,
        jenis_kredit=payload.jenis_kredit,
        peruntukan_kredit=payload.peruntukan_kredit,
        alasan_ditolak=payload.alasan_ditolak,
        kapasitas=payload.kapasitas,
        jaminan=payload.jaminan,
        informasi_negatif=payload.informasi_negatif,
        kantor=payload.kantor,
        kepala_cabang=payload.kepala_cabang,
        analis=payload.analis or current_user.full_name,
        tanggal_ditolak=payload.tanggal_ditolak,
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.put("/{id}", response_model=RejectionLogResponse)
def update_rejection_log(
    id: int,
    payload: RejectionLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Memperbarui data catatan penolakan nasabah."""
    item = db.query(RejectionLog).filter(RejectionLog.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data logbook penolakan tidak ditemukan.")
        
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(item, field, val)
        
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rejection_log(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Menghapus catatan penolakan nasabah dari logbook."""
    item = db.query(RejectionLog).filter(RejectionLog.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data logbook penolakan tidak ditemukan.")
        
    db.delete(item)
    db.commit()
    return None
