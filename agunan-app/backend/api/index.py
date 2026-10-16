import sys
import os
import traceback

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

class VercelPathMiddleware:
    """Memperbaiki path URL asli dari header Vercel x-matched-path."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            headers = dict(scope.get("headers", []))
            matched_path = (
                headers.get(b"x-matched-path")
                or headers.get(b"x-original-url")
                or headers.get(b"x-rewrite-url")
                or headers.get(b"x-forwarded-uri")
            )
            if matched_path:
                parts = matched_path.decode("utf-8").split("?")
                scope["path"] = parts[0]
                if len(parts) > 1 and not scope.get("query_string"):
                    scope["query_string"] = parts[1].encode("utf-8")
            else:
                path = scope.get("path", "")
                if path.startswith("/api/index.py"):
                    scope["path"] = path[len("/api/index.py"):] or "/"
        await self.app(scope, receive, send)

wrapped_app = VercelPathMiddleware(app)

try:
    from mangum import Mangum
    _mangum = Mangum(wrapped_app, lifespan="off")

    def handler(event, context):
        if isinstance(event, dict):
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
    handler = wrapped_app
