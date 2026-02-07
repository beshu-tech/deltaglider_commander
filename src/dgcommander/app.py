"""Flask application factory for the DeltaGlider UI backend."""

from __future__ import annotations

import logging
import os
from pathlib import Path

from flask import Flask, g, send_from_directory
from flask_cors import CORS

from .api.auth import auth_bp
from .api.buckets import bp as buckets_bp
from .api.connection import bp as connection_bp
from .api.downloads import bp as downloads_bp
from .api.objects import bp as objects_bp
from .api.uploads import bp as uploads_bp
from .auth.filesystem_session_store import FileSystemSessionStore
from .deps import (
    DGCommanderConfig,
    ServiceContainer,
    build_default_sdk,
    build_housekeeping_sdk,
    build_services,
    load_config,
)
from .jobs.purge_scheduler import PurgeScheduler
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

    _configure_logging(app)
    _log_and_sanitize_environment()

    cfg = config or load_config()
    app.config["DGCOMM_CONFIG"] = cfg

    services, sdk = _resolve_services(cfg, sdk, services)
    app.extensions["dgcommander"] = services

    session_store = _init_session_store(cfg)
    app.extensions["session_store"] = session_store

    _maybe_start_purge_scheduler(app, cfg, sdk)
    register_error_handlers(app)
    _configure_cors(app, cfg)
    _register_request_hooks(app, cfg)
    _register_blueprints(app)
    _register_static_routes(app)
    _register_teardown(app)

    return app


def _configure_logging(app: Flask) -> None:
    # Use DGCOMM_LOG_LEVEL env var (default: INFO) to control verbosity
    log_level = os.environ.get("DGCOMM_LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO), format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    app.logger.setLevel(getattr(logging, log_level, logging.INFO))

    # Silence noisy third-party loggers (especially boto3/botocore)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("s3transfer").setLevel(logging.WARNING)


def _log_and_sanitize_environment() -> None:
    # IMPORTANT: Unset AWS_* environment variables to prevent boto3/deltaglider
    # from using them.  The app should ONLY use credentials provided via the UI
    # (passed as DGCOMM_S3_* or per-session).
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
    for key in aws_vars_to_clear:
        if key in os.environ:
            print(f"  WARNING: Removing {key} from environment (value: {os.environ[key][:10]}...)")
            del os.environ[key]

    print("\nDGCOMM Configuration:")
    for key, value in sorted(os.environ.items()):
        if key.startswith("DGCOMM_") or key in ["FLASK_ENV", "FLASK_DEBUG", "PORT"]:
            if "SECRET" in key or "PASSWORD" in key or "KEY" in key.upper():
                display_value = f"{value[:8]}..." if value and len(value) > 8 else "***"
            else:
                display_value = value
            print(f"  {key}={display_value}")
    print("=" * 80)


def _resolve_services(
    cfg: DGCommanderConfig,
    sdk: DeltaGliderSDK | None,
    services: ServiceContainer | None,
) -> tuple[ServiceContainer, DeltaGliderSDK | None]:
    if services is None:
        # Only initialize a container-level SDK in TEST_MODE.
        # In production, SDK is created per-session from user credentials.
        if sdk is None and cfg.test_mode:
            sdk = build_default_sdk(cfg)
        services = build_services(cfg, sdk)
    else:
        if sdk is None and hasattr(services, "catalog") and hasattr(services.catalog, "sdk"):
            sdk = services.catalog.sdk
    return services, sdk


def _init_session_store(cfg: DGCommanderConfig):
    # Use in-memory store for tests (faster, simpler with mock SDKs).
    # Use filesystem-based store in production for multi-worker Gunicorn.
    if cfg.test_mode:
        from .auth.session_store import SessionStore

        return SessionStore(max_size=cfg.session_max_size, ttl_seconds=cfg.session_idle_ttl)

    session_dir = os.environ.get("DGCOMM_SESSION_DIR")
    return FileSystemSessionStore(
        max_size=cfg.session_max_size,
        ttl_seconds=cfg.session_idle_ttl,
        session_dir=session_dir,
    )


def _maybe_start_purge_scheduler(app: Flask, cfg: DGCommanderConfig, sdk: DeltaGliderSDK | None) -> None:
    if cfg.test_mode:
        app.logger.info("Purge scheduler disabled in test mode")
        return

    housekeeping_sdk = build_housekeeping_sdk()
    purge_sdk = housekeeping_sdk if housekeeping_sdk else sdk

    if purge_sdk is None:
        app.logger.info("Purge scheduler disabled - no SDK configured (set DGCOMM_HOUSEKEEPING_* env vars)")
        return

    purge_interval_hours = int(os.environ.get("DGCOMM_PURGE_INTERVAL_HOURS", "1"))
    purge_scheduler = PurgeScheduler(sdk=purge_sdk, interval_hours=purge_interval_hours)
    app.extensions["purge_scheduler"] = purge_scheduler

    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
        if purge_scheduler.start():
            sdk_type = "housekeeping" if housekeeping_sdk else "default"
            app.logger.info(f"Started purge scheduler with {sdk_type} SDK, interval {purge_interval_hours} hour(s)")
        else:
            app.logger.info("Purge scheduler not started (another process already has the lock)")


def _configure_cors(app: Flask, cfg: DGCommanderConfig) -> None:
    # Development: allow any localhost/127.0.0.1 origin with any port.
    # Production: use specific origins from CORS_ORIGINS env var.
    is_dev_mode = app.debug or cfg.test_mode
    if is_dev_mode:
        CORS(
            app,
            resources={r"/*": {"origins": r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"}},
            allow_headers=["Content-Type", "Authorization"],
            methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            supports_credentials=True,
        )
        app.logger.info("CORS: Development mode - allowing all localhost/127.0.0.1 origins")
        return

    cors_origins = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000"
    ).split(",")
    CORS(
        app,
        resources={r"/*": {"origins": cors_origins}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        supports_credentials=True,
    )
    app.logger.info(f"CORS: Production mode - allowing origins: {cors_origins}")


def _register_request_hooks(app: Flask, cfg: DGCommanderConfig) -> None:
    @app.before_request
    def inject_dependencies():
        g.config = cfg
        g.session_store = app.extensions["session_store"]

    @app.before_request
    def log_request():
        from flask import request as flask_request

        SENSITIVE_HEADERS = {
            "authorization",
            "cookie",
            "set-cookie",
            "x-api-key",
            "x-auth-token",
            "x-session-token",
            "proxy-authorization",
            "www-authenticate",
            "x-csrf-token",
        }

        def sanitize_header(value: str | None, max_length: int = 80) -> str:
            if not value:
                return ""
            sanitized = "".join(c if c.isprintable() and c not in "\r\n" else " " for c in str(value))
            if len(sanitized) > max_length:
                return sanitized[:max_length] + "..."
            return sanitized

        def is_sensitive_header(header_name: str) -> bool:
            normalized = header_name.lower()
            return normalized in SENSITIVE_HEADERS or any(
                sensitive in normalized for sensitive in ["password", "secret", "token", "key", "credential"]
            )

        headers_to_log = {
            "Content-Type": sanitize_header(flask_request.headers.get("Content-Type"), 40),
            "Content-Length": sanitize_header(flask_request.headers.get("Content-Length"), 20),
            "User-Agent": sanitize_header(flask_request.headers.get("User-Agent"), 80),
            "Origin": sanitize_header(flask_request.headers.get("Origin"), 80),
        }

        for header_name in flask_request.headers.keys():
            if header_name.startswith("X-") and not is_sensitive_header(header_name):
                if header_name not in ["X-Api-Key", "X-Auth-Token", "X-Session-Token", "X-CSRF-Token"]:
                    headers_to_log[header_name] = sanitize_header(flask_request.headers.get(header_name), 40)

        headers_str = ", ".join(f"{k}: {v}" for k, v in headers_to_log.items() if v)

        if flask_request.path.startswith("/api/buckets/"):
            app.logger.debug(f"{flask_request.method} {flask_request.path} | Headers: {{{headers_str}}}")
        else:
            app.logger.info(f"{flask_request.method} {flask_request.path} | Headers: {{{headers_str}}}")

    @app.after_request
    def log_response(response):
        from flask import request as flask_request

        if flask_request.path.startswith("/api/buckets/"):
            app.logger.debug(f"{flask_request.method} {flask_request.path} → {response.status_code}")
        else:
            app.logger.info(f"{flask_request.method} {flask_request.path} → {response.status_code}")
        return response


def _register_blueprints(app: Flask) -> None:
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(buckets_bp)
    app.register_blueprint(connection_bp)
    app.register_blueprint(objects_bp)
    app.register_blueprint(downloads_bp)
    app.register_blueprint(uploads_bp)

    @app.get("/api/test/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}


def _register_static_routes(app: Flask) -> None:
    static_dir = Path(__file__).parent / "static"

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

    # SPA fallback: API routes get JSON 404; everything else falls through
    # to index.html for client-side routing.
    @app.errorhandler(404)
    def spa_fallback(e):
        from flask import request as flask_request

        if flask_request.path.startswith("/api/"):
            return app.response_class(
                response='{"error": {"code": "not_found", "message": "Route not found"}}',
                status=404,
                mimetype="application/json",
            )

        index_path = static_dir / "index.html"
        if index_path.exists():
            return send_from_directory(static_dir, "index.html")

        return app.response_class(
            response='{"status": "ok", "message": "Deltaglider Commander backend"}',
            status=200,
            mimetype="application/json",
        )


def _register_teardown(app: Flask) -> None:
    @app.teardown_appcontext
    def stop_purge_scheduler(error=None):
        if "purge_scheduler" in app.extensions:
            purge_scheduler = app.extensions["purge_scheduler"]
            app.logger.info("Stopping purge scheduler on shutdown...")
            purge_scheduler.stop()


__all__ = ["create_app"]
