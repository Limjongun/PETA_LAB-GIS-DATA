import argparse
from contextlib import asynccontextmanager
from pathlib import Path
import socket
import sys
import threading
import webbrowser

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from petalab.api import features, gee, jobs, layers, models, osm, projects, selection, tiles, tools
from petalab.config import config
from petalab.core.sample_data import seed_sample_project
from petalab.errors import PetaLabError
from petalab.tools._base import load_all_tools


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_all_tools()
    try:
        seed_sample_project("banjir-surabaya")
    except Exception:
        pass
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="PetaLab Local GIS & Spatial ML API",
        version="1.0.0",
        description="Server lokal PetaLab untuk membaca, mengolah, menganalisis, dan memodelkan data spasial.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(127\.0\.0\.1|localhost)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(PetaLabError)
    async def petalab_error_handler(request: Request, exc: PetaLabError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_dict())

    @app.exception_handler(FileNotFoundError)
    async def not_found_handler(request: Request, exc: FileNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={
                "code": "NOT_FOUND",
                "message": str(exc),
                "hint": "Periksa apakah proyek atau layer masih tersedia di Pustaka Data.",
                "actions": [],
                "detail": str(exc),
            },
        )

    app.include_router(projects.router)
    app.include_router(layers.router)
    app.include_router(tiles.router)
    app.include_router(features.router)
    app.include_router(selection.router)
    app.include_router(tools.router)
    app.include_router(gee.router)
    app.include_router(jobs.router)
    app.include_router(models.router)
    app.include_router(osm.router)

    # Mount static frontend build if present
    frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if frontend_dist.exists():
        assets_dir = frontend_dist / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa(full_path: str):
            if full_path.startswith(("api/", "tiles/", "ws/")) or full_path in ("api", "tiles", "ws"):
                return JSONResponse(
                    status_code=404,
                    content={
                        "code": "NOT_FOUND",
                        "message": f"Endpoint '/{full_path}' tidak ditemukan.",
                        "hint": "Periksa URL endpoint API atau dokumentasi Swagger di /docs.",
                        "actions": [],
                    },
                )
            candidate = (frontend_dist / full_path).resolve()
            if full_path and str(candidate).startswith(str(frontend_dist.resolve())) and candidate.is_file():
                return FileResponse(candidate)
            # Inject local session token only into the SPA HTML served from localhost so external sites cannot invoke /api/python/console
            raw_html = (frontend_dist / "index.html").read_text(encoding="utf-8")
            token_script = f'<script>window.__PETALAB_SESSION_TOKEN__ = "{config.session_token}";</script></head>'
            patched_html = raw_html.replace("</head>", token_script, 1) if "</head>" in raw_html else raw_html
            return HTMLResponse(content=patched_html)

    return app


app = create_app()


def find_available_port(start_port: int = 8765) -> int:
    for p in range(start_port, start_port + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
    return start_port


def cli() -> None:
    parser = argparse.ArgumentParser(description="PetaLab Local Web GIS Server")
    parser.add_argument("--host", default=config.host, help="Host bind address (default 127.0.0.1)")
    parser.add_argument("--port", type=int, default=config.port, help="Port number (default 8765)")
    parser.add_argument("--open-browser", action="store_true", help="Open browser automatically on start")
    args = parser.parse_args()

    port = find_available_port(args.port)
    config.port = port
    url = f"http://{args.host}:{port}"
    print(f"\n=======================================================")
    print(f"  PetaLab GIS Web aktif di: {url}")
    print(f"  Workspace: {config.workspace_dir}")
    print(f"=======================================================\n")

    if args.open_browser:
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()

    uvicorn.run("petalab.main:app", host=args.host, port=port, reload=False)


if __name__ == "__main__":
    cli()
