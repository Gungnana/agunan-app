from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    market_search,
    rejection_log,
    rekap_rekening,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autentikasi & Pengguna"])
api_router.include_router(market_search.router, prefix="/market-search", tags=["Pencarian Harga Pasar Bali"])
api_router.include_router(rejection_log.router, prefix="/rejection-log", tags=["Logbook Penolakan Nasabah"])
api_router.include_router(rekap_rekening.router, prefix="/rekap-rekening", tags=["Rekap Rekening Koran OCR"])
