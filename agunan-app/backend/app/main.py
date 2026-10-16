from fastapi import FastAPI, HTTPException, Request
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

class VercelPathFixASGIMiddleware:
    """Memperbaiki path URL asli dari header Vercel x-matched-path sebelum router FastAPI memproses rute."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            headers = dict(scope.get("headers", []))
            matched = (
                headers.get(b"x-matched-path")
                or headers.get(b"x-original-url")
                or headers.get(b"x-rewrite-url")
                or headers.get(b"x-forwarded-uri")
            )
            if matched:
                parts = matched.decode("utf-8").split("?")
                scope["path"] = parts[0]
                if len(parts) > 1 and not scope.get("query_string"):
                    scope["query_string"] = parts[1].encode("utf-8")
            elif scope.get("path") in ("/api/index.py", "/api/index", "/api", ""):
                scope["path"] = "/"
        await self.app(scope, receive, send)

# Tambahkan ASGI Middleware Vercel
app.add_middleware(VercelPathFixASGIMiddleware)

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
def root(request: Request):
    """Halaman pengantar API Backend."""
    return {
        "pesan": "Selamat datang di Sistem Analisa Agunan Berbasis Data Pasar",
        "headers": dict(request.headers),
        "scope": {k: str(v) for k, v in request.scope.items() if k != "app"},
    }


@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE"])
def debug_catch_all(full_path: str, request: Request):
    """Debug route jika rute lain tidak cocok."""
    return {
        "status": "CATCH_ALL",
        "matched_param": full_path,
        "scope_path": request.scope.get("path"),
        "headers": dict(request.headers),
    }
