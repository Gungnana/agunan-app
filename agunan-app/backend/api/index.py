import sys
import os
import traceback
import urllib.parse

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
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse
    
    app = FastAPI(title="Backend Error Fallback")
    
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    def error_handler(path: str = ""):
        return PlainTextResponse(
            f"Sistem Analisa Agunan - Startup Error:\n\n{error_trace}\n\nSilakan periksa variabel environment di Vercel.",
            status_code=500,
        )

try:
    from mangum import Mangum
    _mangum = Mangum(app, lifespan="off")

    def handler(event, context):
        if isinstance(event, dict):
            query_params = event.get("queryStringParameters") or {}
            if "__vercel_path__" in query_params:
                raw_path = query_params.pop("__vercel_path__")
                if not raw_path.startswith("/"):
                    raw_path = "/" + raw_path
                event["path"] = raw_path
                if "rawPath" in event:
                    event["rawPath"] = raw_path
            else:
                headers = event.get("headers") or {}
                matched = (
                    headers.get("x-matched-path")
                    or headers.get("X-Matched-Path")
                    or headers.get("x-original-url")
                )
                if matched:
                    parts = matched.split("?")
                    event["path"] = parts[0]
                    if "rawPath" in event:
                        event["rawPath"] = parts[0]
                elif event.get("path") in ("/api/index.py", "/api/index"):
                    event["path"] = "/"
        return _mangum(event, context)

except Exception:
    handler = app
