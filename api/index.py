import sys
import os
import traceback
import urllib.parse

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "agunan-app", "backend")

for p in [backend_dir, root_dir]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from app.main import app
except Exception as e:
    error_trace = traceback.format_exc()
    from fastapi import FastAPI
    from fastapi.responses import PlainTextResponse
    app = FastAPI(title="Root Fallback App")
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    def err_handler(path: str = ""):
        return PlainTextResponse(f"Startup Error:\n\n{error_trace}", status_code=500)

try:
    from mangum import Mangum
    _mangum = Mangum(app, lifespan="off")

    def handler(event, context):
        if isinstance(event, dict):
            # Check for __vercel_path__ in query parameters
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
