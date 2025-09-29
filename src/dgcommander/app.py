"""Flask application factory for the DeltaGlider UI backend."""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from flask import Flask, send_from_directory
from flask_cors import CORS

from .api.buckets import bp as buckets_bp
from .api.downloads import bp as downloads_bp
from .api.objects import bp as objects_bp
from .api.uploads import bp as uploads_bp
from .deps import (
    DGCommanderConfig,
    ServiceContainer,
    build_default_sdk,
    build_services,
    load_config,
)
from .services.deltaglider import DeltaGliderSDK
from .util.errors import register_error_handlers


def create_app(
    *,
    config: Optional[DGCommanderConfig] = None,
    sdk: Optional[DeltaGliderSDK] = None,
    services: Optional[ServiceContainer] = None,
) -> Flask:
    app = Flask(
        "dgcommander",
        static_folder=str(Path(__file__).parent / "static"),
        static_url_path="/",
    )

    cfg = config or load_config()
    app.config["DGCOMM_CONFIG"] = cfg

    if services is None:
        if sdk is None:
            sdk = build_default_sdk(cfg)
        services = build_services(cfg, sdk)

    app.extensions["dgcommander"] = services

    register_error_handlers(app)

    CORS(
        app,
        resources={r"/*": {"origins": "*"}},
        allow_headers="*",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        send_wildcard=True,
        supports_credentials=False,
    )

    app.register_blueprint(buckets_bp)
    app.register_blueprint(objects_bp)
    app.register_blueprint(downloads_bp)
    app.register_blueprint(uploads_bp)

    @app.get("/api/test/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    static_dir = Path(app.static_folder or "")

    @app.get("/")
    def root() -> str:
        index_path = static_dir / "index.html"
        if index_path.exists():
            return send_from_directory(static_dir, "index.html")
        return "DeltaGlider Backend", 200

    return app


__all__ = ["create_app"]
