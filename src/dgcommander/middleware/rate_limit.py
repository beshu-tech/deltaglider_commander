"""Simple per-IP rate limiting middleware."""

from __future__ import annotations

import time
from collections import defaultdict, deque

from flask import Request

from ..util.errors import RateLimitExceeded


class FixedWindowRateLimiter:
    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.time()
        window_start = now - self.window_seconds
        bucket = self._hits[key]
        while bucket and bucket[0] < window_start:
            bucket.popleft()
        if len(bucket) >= self.limit:
            raise RateLimitExceeded()
        bucket.append(now)


class RateLimiterMiddleware:
    def __init__(self, limiter: FixedWindowRateLimiter) -> None:
        self._limiter = limiter

    def enforce(self, request: Request) -> None:
        peer = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
        self._limiter.check(peer)
