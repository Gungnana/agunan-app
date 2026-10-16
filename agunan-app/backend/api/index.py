"""
Entrypoint Vercel Serverless Function untuk FastAPI.
Mangum membungkus ASGI app agar bisa berjalan sebagai AWS Lambda / Vercel Serverless.
"""
import sys
import os

# Pastikan folder backend ada di Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from mangum import Mangum

# Handler untuk Vercel Serverless Functions
handler = Mangum(app, lifespan="off")
