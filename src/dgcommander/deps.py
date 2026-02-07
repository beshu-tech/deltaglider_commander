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
from .services.list_cache import ListObjectsCache
from .services.presigned import PresignedUrlService


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
    objects_rate_limit: int = 10
    objects_rate_window: float = 1.0
    session_max_size: int = 20
    session_idle_ttl: int = 1800
    test_mode: bool = False
    s3: S3Config = field(default_factory=S3Config)
    # Object listing cache configuration
    list_cache_ttl: int = 5  # seconds – short TTL to absorb bursts, not mask staleness
    list_cache_max_size: int = 100  # max cached folders


@dataclass(slots=True)
class ServiceContainer:
    catalog: CatalogService
    presigned: PresignedUrlService
    jobs: SavingsJobRunner
    rate_limiter: RateLimiterMiddleware


def load_config(env: dict[str, str] | None = None) -> DGCommanderConfig:
    env = env or os.environ
    secret = env.get("DGCOMM_HMAC_SECRET") or secrets.token_hex(32)
    limit = int(env.get("DGCOMM_OBJECT_RATE_LIMIT", "10"))
    window = float(env.get("DGCOMM_OBJECT_RATE_WINDOW", "1.0"))
    session_max = int(env.get("DGCOMM_SESSION_MAX_SIZE", "20"))
    session_ttl = int(env.get("DGCOMM_SESSION_IDLE_TTL", "1800"))
    test_mode = _coerce_bool(env.get("DGCOMM_TEST_MODE") or env.get("TEST_MODE"), default=False)
    list_cache_ttl = int(env.get("DGCOMM_LIST_CACHE_TTL", "5"))
    list_cache_max_size = int(env.get("DGCOMM_LIST_CACHE_MAX_SIZE", "100"))
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
        objects_rate_limit=limit,
        objects_rate_window=window,
        session_max_size=session_max,
        session_idle_ttl=session_ttl,
        test_mode=test_mode,
        s3=s3,
        list_cache_ttl=list_cache_ttl,
        list_cache_max_size=list_cache_max_size,
    )


def build_services(config: DGCommanderConfig, sdk: DeltaGliderSDK | None = None) -> ServiceContainer:
    if sdk is None:
        # In production (non-TEST_MODE), use an empty stub SDK
        # The actual SDK is created per-request from session credentials
        sdk = InMemoryDeltaGliderSDK(buckets=[], objects={}, blobs={})

    # Initialize list cache if TTL > 0
    list_cache = None
    if config.list_cache_ttl > 0:
        list_cache = ListObjectsCache(ttl_seconds=config.list_cache_ttl, max_size=config.list_cache_max_size)

    catalog = CatalogService(sdk=sdk, list_cache=list_cache)
    presigned = PresignedUrlService(sdk=sdk)
    jobs = SavingsJobRunner(catalog=catalog, sdk=sdk)
    limiter = FixedWindowRateLimiter(limit=config.objects_rate_limit, window_seconds=config.objects_rate_window)
    middleware = RateLimiterMiddleware(limiter)
    return ServiceContainer(
        catalog=catalog,
        presigned=presigned,
        jobs=jobs,
        rate_limiter=middleware,
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


def build_housekeeping_sdk(env: dict[str, str] | None = None) -> DeltaGliderSDK | None:
    """Build SDK from housekeeping environment variables.

    Returns None if no housekeeping credentials are configured.
    """
    if env is None:
        env = os.environ

    # Check if housekeeping credentials are provided
    access_key = env.get("DGCOMM_HOUSEKEEPING_S3_ACCESS_KEY")
    secret_key = env.get("DGCOMM_HOUSEKEEPING_S3_SECRET_KEY")

    if not access_key or not secret_key:
        return None

    settings = S3Settings(
        endpoint_url=env.get("DGCOMM_HOUSEKEEPING_S3_ENDPOINT"),
        region_name=env.get("DGCOMM_HOUSEKEEPING_S3_REGION"),
        access_key_id=access_key,
        secret_access_key=secret_key,
        session_token=env.get("DGCOMM_HOUSEKEEPING_S3_SESSION_TOKEN"),
        addressing_style=env.get("DGCOMM_HOUSEKEEPING_S3_ADDRESSING_STYLE", "path"),
        verify=_coerce_bool(env.get("DGCOMM_HOUSEKEEPING_S3_VERIFY_SSL", "true"), default=True),
        cache_dir=env.get("DGCOMM_CACHE_DIR"),  # Share cache dir with main app
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
