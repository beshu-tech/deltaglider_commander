"""Dependency wiring helpers for the application."""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field

from .jobs.indexer import SavingsJobRunner
from .middleware.rate_limit import FixedWindowRateLimiter, RateLimiterMiddleware
from .sdk.adapters.memory import InMemoryDeltaGliderSDK
from .services.catalog import CatalogService
from .services.deltaglider import DeltaGliderSDK, S3DeltaGliderSDK, S3Settings
from .services.downloads import DownloadService
from .util.cache import CacheRegistry, build_cache_registry


@dataclass(slots=True)
class S3Config:
    """
    S3 configuration (legacy).

    Note: S3 credentials are now primarily configured via the web UI and stored
    in session storage. This config is retained for backward compatibility and
    for utility scripts (like seed_minio.py) that may still use environment variables.
    """

    endpoint_url: str | None = None
    region_name: str | None = None
    access_key_id: str | None = None
    secret_access_key: str | None = None
    session_token: str | None = None
    addressing_style: str = "path"
    verify: bool = True
    cache_dir: str | None = None


@dataclass(slots=True)
class DGCommanderConfig:
    hmac_secret: str
    download_token_ttl: int = 300
    objects_rate_limit: int = 10
    objects_rate_window: float = 1.0
    session_max_size: int = 20
    session_idle_ttl: int = 1800
    test_mode: bool = False
    cache_enabled: bool = True
    s3: S3Config = field(default_factory=S3Config)


@dataclass(slots=True)
class ServiceContainer:
    catalog: CatalogService
    downloads: DownloadService
    jobs: SavingsJobRunner
    rate_limiter: RateLimiterMiddleware
    caches: CacheRegistry


def load_config(env: dict[str, str] | None = None) -> DGCommanderConfig:
    env = env or os.environ
    secret = env.get("DGCOMM_HMAC_SECRET") or secrets.token_hex(32)
    ttl = int(env.get("DGCOMM_DOWNLOAD_TTL", "300"))
    limit = int(env.get("DGCOMM_OBJECT_RATE_LIMIT", "10"))
    window = float(env.get("DGCOMM_OBJECT_RATE_WINDOW", "1.0"))
    session_max = int(env.get("DGCOMM_SESSION_MAX_SIZE", "20"))
    session_ttl = int(env.get("DGCOMM_SESSION_IDLE_TTL", "1800"))
    test_mode = _coerce_bool(env.get("DGCOMM_TEST_MODE") or env.get("TEST_MODE"), default=False)
    cache_enabled = _coerce_bool(env.get("CACHE_ENABLED", "true"), default=True)
    s3 = S3Config(
        endpoint_url=env.get("DGCOMM_S3_ENDPOINT"),
        region_name=env.get("DGCOMM_S3_REGION"),
        access_key_id=env.get("DGCOMM_S3_ACCESS_KEY"),
        secret_access_key=env.get("DGCOMM_S3_SECRET_KEY"),
        session_token=env.get("DGCOMM_S3_SESSION_TOKEN"),
        addressing_style=env.get("DGCOMM_S3_ADDRESSING_STYLE", "path"),
        verify=_coerce_bool(env.get("DGCOMM_S3_VERIFY_SSL", "true"), default=True),
        cache_dir=env.get("DGCOMM_CACHE_DIR"),
    )
    return DGCommanderConfig(
        hmac_secret=secret,
        download_token_ttl=ttl,
        objects_rate_limit=limit,
        objects_rate_window=window,
        session_max_size=session_max,
        session_idle_ttl=session_ttl,
        test_mode=test_mode,
        cache_enabled=cache_enabled,
        s3=s3,
    )


def build_services(config: DGCommanderConfig, sdk: DeltaGliderSDK | None = None) -> ServiceContainer:
    if sdk is None:
        # In production (non-TEST_MODE), use an empty stub SDK
        # The actual SDK is created per-request from session credentials
        sdk = InMemoryDeltaGliderSDK(buckets=[], objects={}, blobs={})
    caches = build_cache_registry(enabled=config.cache_enabled)
    catalog = CatalogService(sdk=sdk, caches=caches)
    downloads = DownloadService(sdk=sdk, secret_key=config.hmac_secret, ttl_seconds=config.download_token_ttl)
    jobs = SavingsJobRunner(catalog=catalog, sdk=sdk)
    limiter = FixedWindowRateLimiter(limit=config.objects_rate_limit, window_seconds=config.objects_rate_window)
    middleware = RateLimiterMiddleware(limiter)
    return ServiceContainer(
        catalog=catalog,
        downloads=downloads,
        jobs=jobs,
        rate_limiter=middleware,
        caches=caches,
    )


def build_default_sdk(config: DGCommanderConfig) -> DeltaGliderSDK:
    settings = S3Settings(
        endpoint_url=config.s3.endpoint_url,
        region_name=config.s3.region_name,
        access_key_id=config.s3.access_key_id,
        secret_access_key=config.s3.secret_access_key,
        session_token=config.s3.session_token,
        addressing_style=config.s3.addressing_style,
        verify=config.s3.verify,
        cache_dir=config.s3.cache_dir,
    )
    return S3DeltaGliderSDK(settings)


def _coerce_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default
