from fastapi import FastAPI
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
def health_check():
    """Endpoint pemeriksaan kesehatan layanan (Liveness / Readiness Probe)."""
    return {
        "status": "UP",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }


@app.get("/", tags=["Sistem"])
def root():
    """Halaman pengantar API Backend."""
    return {
        "pesan": "Selamat datang di Sistem Analisa Agunan Berbasis Data Pasar",
        "dokumentasi": "/docs",
        "api_v1": "/api/v1",
    }
