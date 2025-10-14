"""Flask application factory for the DeltaGlider UI backend."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Flask, g, send_from_directory
from flask_cors import CORS

from .api.auth import auth_bp
from .api.buckets import bp as buckets_bp
from .api.downloads import bp as downloads_bp
from .api.objects import bp as objects_bp
from .api.uploads import bp as uploads_bp
from .auth import SessionStore
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
    config: DGCommanderConfig | None = None,
    sdk: DeltaGliderSDK | None = None,
    services: ServiceContainer | None = None,
) -> Flask:
    app = Flask(
        "dgcommander",
        static_folder=None,  # Disable automatic static file handling
    )

    # Configure logging
    # Use DGCOMM_LOG_LEVEL env var (default: INFO) to control verbosity
    # Set to DEBUG for development, WARNING or ERROR for production
    log_level = os.environ.get("DGCOMM_LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    app.logger.setLevel(getattr(logging, log_level, logging.INFO))

    # Silence noisy third-party loggers (especially boto3/botocore)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("s3transfer").setLevel(logging.WARNING)

    # IMPORTANT: Unset AWS_* environment variables to prevent boto3/deltaglider from using them
    # The app should ONLY use credentials provided via UI (passed as DGCOMM_S3_* or per-session)
    aws_vars_to_clear = [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_SESSION_TOKEN",
        "AWS_DEFAULT_REGION",
        "AWS_REGION",
        "AWS_ENDPOINT_URL",
        "AWS_PROFILE",
    ]

    print("=" * 80)
    print("DGCOMMANDER STARTUP - ENVIRONMENT CLEANUP")
    print("=" * 80)

    # Show and clear AWS_* variables
    for key in aws_vars_to_clear:
        if key in os.environ:
            print(f"  WARNING: Removing {key} from environment (value: {os.environ[key][:10]}...)")
            del os.environ[key]

    # Print DGCOMM_* variables (these are OK to use)
    print("\nDGCOMM Configuration:")
    for key, value in sorted(os.environ.items()):
        if key.startswith("DGCOMM_") or key in ["FLASK_ENV", "FLASK_DEBUG", "PORT"]:
            # Mask sensitive values
            if "SECRET" in key or "PASSWORD" in key or "KEY" in key.upper():
                display_value = f"{value[:8]}..." if value and len(value) > 8 else "***"
            else:
                display_value = value
            print(f"  {key}={display_value}")
    print("=" * 80)

    cfg = config or load_config()
    app.config["DGCOMM_CONFIG"] = cfg

    if services is None:
        if sdk is None:
            # Only initialize container-level SDK in TEST_MODE
            # In production, SDK is created per-session from user credentials
            if cfg.test_mode:
                sdk = build_default_sdk(cfg)
        services = build_services(cfg, sdk)
    else:
        # When services are provided directly (e.g., in tests), extract SDK if available
        if sdk is None and hasattr(services, "catalog") and hasattr(services.catalog, "sdk"):
            sdk = services.catalog.sdk

    app.extensions["dgcommander"] = services

    # Initialize session store for client-side credentials
    session_store = SessionStore(
        max_size=cfg.session_max_size,
        ttl_seconds=cfg.session_idle_ttl,
    )
    app.extensions["session_store"] = session_store

    register_error_handlers(app)

    # CORS configuration
    # Note: supports_credentials requires specific origins, not "*"
    cors_origins = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000"
    ).split(",")

    CORS(
        app,
        resources={r"/*": {"origins": cors_origins}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        supports_credentials=True,  # Enable credentials for session cookies
    )

    # Before request hook to inject config and session store into g
    @app.before_request
    def inject_dependencies():
        g.config = cfg
        g.session_store = app.extensions["session_store"]

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(buckets_bp)
    app.register_blueprint(objects_bp)
    app.register_blueprint(downloads_bp)
    app.register_blueprint(uploads_bp)

    @app.get("/api/test/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    # Define static directory explicitly
    static_dir = Path(__file__).parent / "static"

    # Serve static assets (CSS, JS, etc.)
    @app.route("/assets/<path:filename>")
    def serve_assets(filename):
        return send_from_directory(static_dir / "assets", filename)

    @app.get("/")
    def root():
        index_path = static_dir / "index.html"
        if index_path.exists():
            return send_from_directory(static_dir, "index.html")
        return app.response_class(
            response='{"status":  "ok", "message": "Deltaglider Commander backend"}',
            status=200,
            mimetype="application/json",
        )

    # SPA fallback using 404 error handler
    # This ensures API routes are checked first before falling back to SPA routing
    @app.errorhandler(404)
    def spa_fallback(e):
        # If the request is for an API endpoint that doesn't exist, return JSON 404
        from flask import request as flask_request

        if flask_request.path.startswith("/api/"):
            return app.response_class(
                response='{"error": {"code": "not_found", "message": "Route not found"}}',
                status=404,
                mimetype="application/json",
            )

        # For all other 404s (SPA routes), serve index.html for client-side routing
        index_path = static_dir / "index.html"
        if index_path.exists():
            return send_from_directory(static_dir, "index.html")

        # Fallback if no index.html
        return app.response_class(
            response='{"status": "ok", "message": "Deltaglider Commander backend"}',
            status=200,
            mimetype="application/json",
        )

    return app


__all__ = ["create_app"]
