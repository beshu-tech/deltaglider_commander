"""Shared helpers for session store implementations."""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass

from dgcommander.sdk.protocol import DeltaGliderSDK


@dataclass
class SessionData:
    """Session data containing credentials and cached SDK client."""

    credentials: dict
    sdk_client: DeltaGliderSDK
    last_accessed: float
    created_at: float


class BaseSessionStore:
    """Common utilities shared between in-memory and filesystem session stores."""

    def __init__(self, *, max_size: int, ttl_seconds: int) -> None:
        self._max_size = max_size
        self._ttl = ttl_seconds

    def _hash_credentials(self, credentials: dict) -> str:
        cred_str = (
            f"{credentials.get('access_key_id')}:{credentials.get('secret_access_key')}:"
            f"{credentials.get('region')}:{credentials.get('endpoint')}"
        )
        return hashlib.sha256(cred_str.encode()).hexdigest()

    def _is_expired(self, session_data: SessionData) -> bool:
        return (time.time() - session_data.last_accessed) > self._ttl

    def _touch(self, session_data: SessionData) -> None:
        session_data.last_accessed = time.time()
