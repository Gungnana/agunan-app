from typing import List, Optional, Any, Dict
import urllib.parse
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_user_optional
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


@router.get("/profile-search")
async def search_customer_profile(
    nama: str,
    alamat: Optional[str] = None,
    category: Optional[str] = "all",
    q: Optional[str] = None,
    limit: int = 15,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Pencarian artikel, postingan sosial, berita, dan rekam jejak nasabah di internet (OSINT Background Check).
    """
    nama_clean = nama.strip()
    if not nama_clean:
        raise HTTPException(status_code=400, detail="Nama nasabah tidak boleh kosong.")
        
    loc_kw = "Bali"
    if alamat and alamat != "-":
        for city in ["Denpasar", "Badung", "Kuta", "Gianyar", "Tabanan", "Buleleng", "Singaraja", "Karangasem", "Klungkung", "Jembrana", "Negara", "Bangli"]:
            if city.lower() in alamat.lower():
                loc_kw = city
                break

    if q and q.strip():
        search_query = q.strip()
    else:
        if category == "news":
            search_query = f'"{nama_clean}" ({loc_kw} OR berita OR artikel OR pers)'
        elif category == "social":
            search_query = f'"{nama_clean}" (site:facebook.com OR site:instagram.com OR site:linkedin.com OR site:tiktok.com OR site:twitter.com)'
        elif category == "negative":
            search_query = f'"{nama_clean}" ({loc_kw} OR kasus OR penipuan OR sengketa OR pengadilan OR putusan OR pailit OR buron OR tersangka OR macet)'
        else: # "all"
            search_query = f'"{nama_clean}" {loc_kw}'

    encoded_name = urllib.parse.quote(f'"{nama_clean}"')
    encoded_query = urllib.parse.quote(search_query)

    quick_links = [
        {
            "name": "Google Web",
            "url": f"https://www.google.com/search?q={encoded_query}",
            "type": "google",
            "icon": "Search",
        },
        {
            "name": "Google Berita",
            "url": f"https://news.google.com/search?q={encoded_name}%20Bali",
            "type": "news",
            "icon": "Newspaper",
        },
        {
            "name": "Direktori Putusan MA RI",
            "url": f"https://putusan3.mahkamahagung.go.id/search.html?q={encoded_name}",
            "type": "legal",
            "icon": "Scale",
        },
        {
            "name": "LinkedIn Profil",
            "url": f"https://www.linkedin.com/search/results/all/?keywords={encoded_name}",
            "type": "linkedin",
            "icon": "Linkedin",
        },
        {
            "name": "Facebook",
            "url": f"https://www.facebook.com/search/top?q={encoded_name}",
            "type": "facebook",
            "icon": "Facebook",
        },
    ]

    results = []
    if settings.BRAVE_SEARCH_API_KEY:
        try:
            headers = {
                "X-Subscription-Token": settings.BRAVE_SEARCH_API_KEY,
                "Accept": "application/json",
                "User-Agent": f"{settings.APP_NAME}/{settings.APP_VERSION} (profiling)",
            }
            timeout = httpx.Timeout(10.0, connect=4.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={"q": search_query, "count": limit, "country": "ID"},
                    headers=headers,
                )
                if res.status_code == 200:
                    data = res.json()
                    web_results = data.get("web", {}).get("results", [])
                    news_results = data.get("news", {}).get("results", [])

                    seen_urls = set()

                    for item in news_results:
                        url = item.get("url", "")
                        if url and url not in seen_urls:
                            seen_urls.add(url)
                            results.append({
                                "title": item.get("title", ""),
                                "url": url,
                                "description": item.get("description", ""),
                                "source": item.get("meta_url", {}).get("hostname") or item.get("source", "Berita Online"),
                                "published_date": item.get("age", ""),
                                "type": "news",
                            })

                    for item in web_results:
                        url = item.get("url", "")
                        if url and url not in seen_urls:
                            seen_urls.add(url)
                            source = item.get("meta_url", {}).get("hostname", "")
                            res_type = "article"
                            url_lower = url.lower()
                            title_lower = (item.get("title") or "").lower()
                            
                            if any(soc in url_lower for soc in ["facebook.com", "instagram.com", "linkedin.com", "tiktok.com", "twitter.com", "x.com"]):
                                res_type = "social"
                            elif any(leg in url_lower or leg in title_lower for leg in ["mahkamahagung", "putusan", "polri", "kejaksaan", "kasus", "sidang", "tersangka", "sengketa", "penipuan"]):
                                res_type = "negative"
                            elif any(med in url_lower for med in ["detik.com", "kompas.com", "tribunnews.com", "jawapos.com", "balipost.com", "nusabali.com", "radarbali"]):
                                res_type = "news"

                            results.append({
                                "title": item.get("title", ""),
                                "url": url,
                                "description": item.get("description", ""),
                                "source": source or "Web",
                                "published_date": item.get("age", ""),
                                "type": res_type,
                            })
        except Exception:
            pass

    return {
        "nama": nama_clean,
        "query": search_query,
        "category": category,
        "total_results": len(results),
        "results": results,
        "quick_links": quick_links,
    }


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
