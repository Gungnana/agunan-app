from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    pengajuan,
    agunan,
    pembanding,
    valuasi,
    parameter,
    audit,
    market_search,
    rejection_log,
    rekap_rekening,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autentikasi & Pengguna"])
api_router.include_router(pengajuan.router, prefix="/pengajuan", tags=["Pengajuan Kredit"])
api_router.include_router(agunan.router, prefix="/agunan", tags=["Agunan Tanah"])
api_router.include_router(pembanding.router, prefix="/pembanding", tags=["Data Pasar Pembanding"])
api_router.include_router(valuasi.router, prefix="/valuasi", tags=["Mesin Valuasi Agunan"])
api_router.include_router(parameter.router, prefix="/parameter", tags=["Parameter Valuasi"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Log & Kepatuhan"])
api_router.include_router(market_search.router, prefix="/market-search", tags=["Pencarian Harga Pasar Bali"])
api_router.include_router(rejection_log.router, prefix="/rejection-log", tags=["Logbook Penolakan Nasabah"])
api_router.include_router(rekap_rekening.router, prefix="/rekap-rekening", tags=["Rekap Rekening Koran"])
