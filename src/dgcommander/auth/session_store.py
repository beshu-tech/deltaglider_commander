"""Session store for managing user sessions with AWS credentials and SDK clients."""

import hashlib
import secrets
import threading
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


class SessionStore:
    """Thread-safe in-memory session store with LRU eviction and TTL."""

    def __init__(self, max_size: int = 20, ttl_seconds: int = 1800):
        """
        Initialize session store.

        Args:
            max_size: Maximum number of concurrent sessions (default: 20)
            ttl_seconds: Idle timeout in seconds (default: 1800 = 30 minutes)
        """
        self._sessions: dict[str, SessionData] = {}
        self._access_order: list[str] = []  # For LRU tracking
        self._lock = threading.RLock()
        self._max_size = max_size
        self._ttl = ttl_seconds

    def _hash_credentials(self, credentials: dict) -> str:
        """Generate hash of credentials for deduplication."""
        # Sort keys for consistent hashing
        cred_str = f"{credentials.get('access_key_id')}:{credentials.get('secret_access_key')}:{credentials.get('region')}:{credentials.get('endpoint')}"
        return hashlib.sha256(cred_str.encode()).hexdigest()

    def _is_expired(self, session_data: SessionData) -> bool:
        """Check if session has exceeded idle TTL."""
        return (time.time() - session_data.last_accessed) > self._ttl

    def _update_access_order(self, session_id: str) -> None:
        """Update LRU access order (must be called with lock held)."""
        if session_id in self._access_order:
            self._access_order.remove(session_id)
        self._access_order.append(session_id)

    def _evict_lru(self) -> None:
        """Evict least recently used session (must be called with lock held)."""
        if not self._access_order:
            return

        lru_session_id = self._access_order.pop(0)
        self._sessions.pop(lru_session_id, None)

    def find_by_credentials_hash(self, cred_hash: str) -> str | None:
        """
        Find existing valid session for given credentials.

        Args:
            cred_hash: Hash of credentials to search for

        Returns:
            Session ID if valid session exists, None otherwise
        """
        with self._lock:
            for session_id, session_data in list(self._sessions.items()):
                if self._hash_credentials(session_data.credentials) == cred_hash:
                    if not self._is_expired(session_data):
                        return session_id
                    else:
                        # Clean up expired session
                        self._sessions.pop(session_id, None)
                        if session_id in self._access_order:
                            self._access_order.remove(session_id)

            return None

    def create_or_reuse(self, credentials: dict, sdk_client: DeltaGliderSDK) -> tuple[str, SessionData]:
        """
        Create new session or return existing session for same credentials.

        Args:
            credentials: AWS credentials dict
            sdk_client: Initialized DeltaGlider SDK client

        Returns:
            Tuple of (session_id, session_data)
        """
        with self._lock:
            # Check for existing session with same credentials
            cred_hash = self._hash_credentials(credentials)
            existing_id = self.find_by_credentials_hash(cred_hash)

            if existing_id:
                # Reuse existing session, update access time
                session_data = self._sessions[existing_id]
                session_data.last_accessed = time.time()
                self._update_access_order(existing_id)
                return existing_id, session_data

            # Create new session
            session_id = secrets.token_urlsafe(32)
            now = time.time()

            session_data = SessionData(
                credentials=credentials,
                sdk_client=sdk_client,
                last_accessed=now,
                created_at=now,
            )

            # Evict LRU if at capacity
            if len(self._sessions) >= self._max_size:
                self._evict_lru()

            self._sessions[session_id] = session_data
            self._update_access_order(session_id)

            return session_id, session_data

    def get(self, session_id: str) -> SessionData | None:
        """
        Get session data and update last_accessed timestamp.

        Args:
            session_id: Session ID to retrieve

        Returns:
            SessionData if session exists and is not expired, None otherwise
        """
        with self._lock:
            session_data = self._sessions.get(session_id)

            if not session_data:
                return None

            if self._is_expired(session_data):
                # Clean up expired session
                self._sessions.pop(session_id, None)
                if session_id in self._access_order:
                    self._access_order.remove(session_id)
                return None

            # Update access time and LRU order
            session_data.last_accessed = time.time()
            self._update_access_order(session_id)

            return session_data

    def delete(self, session_id: str) -> None:
        """
        Delete a session.

        Args:
            session_id: Session ID to delete
        """
        with self._lock:
            self._sessions.pop(session_id, None)
            if session_id in self._access_order:
                self._access_order.remove(session_id)

    def cleanup_expired(self) -> int:
        """
        Remove all expired sessions.

        Returns:
            Number of sessions removed
        """
        with self._lock:
            expired_ids = [sid for sid, data in self._sessions.items() if self._is_expired(data)]

            for sid in expired_ids:
                self._sessions.pop(sid, None)
                if sid in self._access_order:
                    self._access_order.remove(sid)

            return len(expired_ids)

    def count(self) -> int:
        """Get current number of active sessions."""
        with self._lock:
            return len(self._sessions)
