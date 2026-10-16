import sys
import os
import traceback

# Pastikan root folder backend terdaftar di Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

try:
    from app.main import app
except Exception as e:
    error_trace = traceback.format_exc()
    print("=== STARTUP ERROR ===")
    print(error_trace)
    
    # Fallback app untuk menampilkan error langsung di browser ketimbang layar hitam Vercel
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse
    
    app = FastAPI(title="Backend Error Fallback")
    
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    def error_handler(path: str = ""):
        return PlainTextResponse(
            f"Sistem Analisa Agunan - Startup Error:\n\n{error_trace}\n\nSilakan periksa variabel environment di Vercel.",
            status_code=500,
        )

# Export handler untuk serverless wrapper
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except Exception:
    handler = app
