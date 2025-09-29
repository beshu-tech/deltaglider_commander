"""Dependency wiring helpers for the application."""
from __future__ import annotations

import os
import secrets
from dataclasses import dataclass, field
from typing import Optional

from .middleware.rate_limit import FixedWindowRateLimiter, RateLimiterMiddleware
from .services.catalog import CatalogService
from .services.deltaglider import DeltaGliderSDK, S3DeltaGliderSDK, S3Settings
from .services.downloads import DownloadService
from .jobs.indexer import SavingsJobRunner
from .util.cache import CacheRegistry, build_cache_registry


@dataclass(slots=True)
class S3Config:
    endpoint_url: Optional[str] = None
    region_name: Optional[str] = None
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None
    session_token: Optional[str] = None
    addressing_style: str = "path"
    verify: bool = True
    cache_dir: Optional[str] = None


@dataclass(slots=True)
class DGCommanderConfig:
    hmac_secret: str
    download_token_ttl: int = 300
    objects_rate_limit: int = 10
    objects_rate_window: float = 1.0
    s3: S3Config = field(default_factory=S3Config)


@dataclass(slots=True)
class ServiceContainer:
    catalog: CatalogService
    downloads: DownloadService
    jobs: SavingsJobRunner
    rate_limiter: RateLimiterMiddleware
    caches: CacheRegistry


def load_config(env: Optional[dict[str, str]] = None) -> DGCommanderConfig:
    env = env or os.environ
    secret = env.get("DGCOMM_HMAC_SECRET") or secrets.token_hex(32)
    ttl = int(env.get("DGCOMM_DOWNLOAD_TTL", "300"))
    limit = int(env.get("DGCOMM_OBJECT_RATE_LIMIT", "10"))
    window = float(env.get("DGCOMM_OBJECT_RATE_WINDOW", "1.0"))
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
        s3=s3,
    )


def build_services(config: DGCommanderConfig, sdk: Optional[DeltaGliderSDK] = None) -> ServiceContainer:
    if sdk is None:
        sdk = build_default_sdk(config)
    caches = build_cache_registry()
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


def _coerce_bool(value: Optional[str], default: bool) -> bool:
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default
