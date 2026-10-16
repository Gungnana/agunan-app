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
    """Memperbaiki path URL asli dari header x-api-path, parameter __vercel_path__, atau header Vercel."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            headers = dict(scope.get("headers", []))
            
            # 1. Cek header custom x-api-path dari frontend client
            api_path = headers.get(b"x-api-path")
            if api_path:
                decoded = api_path.decode("utf-8").split("?")[0]
                if not decoded.startswith("/api/v1"):
                    if not decoded.startswith("/"):
                        decoded = "/" + decoded
                    decoded = "/api/v1" + decoded
                scope["path"] = decoded
            else:
                # 2. Cek parameter __vercel_path__ dari query string
                qs = scope.get("query_string", b"").decode("latin1")
                if "__vercel_path__=" in qs:
                    import urllib.parse
                    params = urllib.parse.parse_qs(qs, keep_blank_values=True)
                    if "__vercel_path__" in params:
                        raw_path = params.pop("__vercel_path__")[0]
                        if not raw_path.startswith("/"):
                            raw_path = "/" + raw_path
                        scope["path"] = raw_path
                        new_qs = urllib.parse.urlencode(params, doseq=True)
                        scope["query_string"] = new_qs.encode("latin1")
                else:
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
cors_origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
filtered_origins = [o for o in cors_origins if o != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https://.*\.vercel\.app$|^http://localhost(:\d+)?$|^http://127\.0\.0\.1(:\d+)?$",
    allow_origins=filtered_origins,
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


@app.get("/init", tags=["Sistem"])
@app.get("/setup-db", tags=["Sistem"])
@app.post("/setup-db", tags=["Sistem"])
@app.get("/api/setup-db", tags=["Sistem"])
@app.post("/api/setup-db", tags=["Sistem"])
@app.get("/api/v1/setup-db", tags=["Sistem"])
@app.post("/api/v1/setup-db", tags=["Sistem"])
def run_init():
    """Inisialisasi tabel dan akun demo di database."""
    try:
        from app.db.init_db import init_database
        init_database()
        return {
            "status": "SUCCESS",
            "message": "Inisialisasi tabel dan akun awal Supabase berhasil dijalankan!",
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "detail": f"Gagal inisialisasi database: {str(e)}",
        }


@app.get("/", tags=["Sistem"])
@app.get("/api", tags=["Sistem"])
@app.get("/api/", tags=["Sistem"])
def root(request: Request):
    """Halaman pengantar API Backend & Inisialisasi Database."""
    secret = request.query_params.get("secret")
    if secret:
        return run_init()

    return {
        "pesan": "Selamat datang di Sistem Analisa Agunan Berbasis Data Pasar",
        "dokumentasi": "/docs",
        "api_v1": "/api/v1",
    }


