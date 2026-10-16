import sys
import os
import traceback

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

class VercelPathMiddleware:
    """Memperbaiki path URL asli dari header Vercel x-matched-path."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            headers = dict(scope.get("headers", []))
            matched_path = headers.get(b"x-matched-path")
            if matched_path:
                scope["path"] = matched_path.decode("utf-8").split("?")[0]
            else:
                path = scope.get("path", "")
                if path.startswith("/api/index.py"):
                    scope["path"] = path[len("/api/index.py"):] or "/"
        await self.app(scope, receive, send)

wrapped_app = VercelPathMiddleware(app)

try:
    from mangum import Mangum
    handler = Mangum(wrapped_app, lifespan="off")
except Exception:
    handler = wrapped_app
