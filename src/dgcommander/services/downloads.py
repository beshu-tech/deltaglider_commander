"""Download pipeline helpers."""
from __future__ import annotations

import io
from datetime import datetime, timedelta, timezone
from typing import Tuple

from itsdangerous import BadSignature, URLSafeTimedSerializer

from ..util.errors import APIError, NotFoundError
from ..util.types import DownloadPreparation
from .deltaglider import DeltaGliderSDK


class DownloadService:
    def __init__(self, sdk: DeltaGliderSDK, *, secret_key: str, ttl_seconds: int = 300) -> None:
        self._sdk = sdk
        self._serializer = URLSafeTimedSerializer(secret_key, salt="dg-download")
        self._ttl_seconds = ttl_seconds

    def prepare(self, bucket: str, key: str) -> DownloadPreparation:
        try:
            estimated = self._sdk.estimated_object_size(bucket, key)
        except FileNotFoundError as exc:
            raise NotFoundError("object", "key_not_found") from exc
        issued_at = datetime.now(timezone.utc).isoformat()
        token = self._serializer.dumps({"bucket": bucket, "key": key, "issued_at": issued_at})
        return DownloadPreparation(bucket=bucket, key=key, download_token=token, estimated_bytes=estimated)

    def resolve_token(self, token: str) -> Tuple[str, str, io.BufferedReader]:
        try:
            payload = self._serializer.loads(token)
        except BadSignature as exc:
            raise APIError(code="invalid_token", message="Invalid download token", http_status=400) from exc
        bucket = payload.get("bucket")
        key = payload.get("key")
        issued_raw = payload.get("issued_at")
        if not bucket or not key or not issued_raw:
            raise APIError(code="invalid_token", message="Invalid download token", http_status=400)
        try:
            issued_at = datetime.fromisoformat(issued_raw)
        except ValueError as exc:
            raise APIError(code="invalid_token", message="Invalid download token", http_status=400) from exc
        if issued_at.tzinfo is None:
            issued_at = issued_at.replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - issued_at
        if age > timedelta(seconds=self._ttl_seconds):
            raise APIError(code="token_expired", message="Download token expired", http_status=400)
        try:
            stream = self._sdk.open_object_stream(bucket, key)
        except FileNotFoundError as exc:
            raise NotFoundError("object", "key_not_found") from exc
        return bucket, key, stream

