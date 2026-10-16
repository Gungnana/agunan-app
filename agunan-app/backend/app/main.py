from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API Sistem Analisa Agunan Berbasis Data Pasar untuk Analis Kredit Perbankan. "
        "Memproses estimasi nilai pasar agunan tanah menggunakan pendekatan data pasar "
        "(Market Data Approach) sesuai Standar Penilaian Indonesia (SPI)."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Konfigurasi Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hubungkan API Router v1
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Sistem"])
@app.get("/api/health", tags=["Sistem"])
def health_check():
    """Endpoint pemeriksaan kesehatan layanan (Liveness / Readiness Probe)."""
    return {
        "status": "UP",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }


@app.get("/setup-db", tags=["Sistem"])
@app.post("/setup-db", tags=["Sistem"])
@app.get("/api/setup-db", tags=["Sistem"])
@app.post("/api/setup-db", tags=["Sistem"])
def setup_database(secret: str):
    """Endpoint sekali pakai untuk inisialisasi tabel Supabase & akun awal."""
    if not settings.SECRET_KEY or secret != settings.SECRET_KEY:
        raise HTTPException(
            status_code=403,
            detail="Akses ditolak: parameter secret tidak cocok dengan SECRET_KEY di environment.",
        )
    try:
        from app.db.init_db import init_database
        init_database()
        return {
            "status": "SUCCESS",
            "message": "Inisialisasi tabel dan akun awal Supabase berhasil dijalankan!",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal melakukan inisialisasi database: {str(e)}",
        )


@app.get("/", tags=["Sistem"])
@app.get("/api", tags=["Sistem"])
@app.get("/api/", tags=["Sistem"])
def root():
    """Halaman pengantar API Backend."""
    return {
        "pesan": "Selamat datang di Sistem Analisa Agunan Berbasis Data Pasar",
        "dokumentasi": "/docs",
        "api_v1": "/api/v1",
    }
