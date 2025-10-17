"""Filesystem-based session store for multi-worker deployments."""

import hashlib
import os
import pickle
import secrets
import tempfile
import threading
import time
from dataclasses import dataclass
from pathlib import Path

from dgcommander.sdk.protocol import DeltaGliderSDK


@dataclass
class SessionData:
    """Session data containing credentials and cached SDK client."""

    credentials: dict
    sdk_client: DeltaGliderSDK
    last_accessed: float
    created_at: float


class FileSystemSessionStore:
    """Thread-safe filesystem-based session store with LRU eviction and TTL.

    Designed for multi-worker environments where sessions must be shared
    across multiple processes. Uses filesystem for persistence and file
    locking for thread-safety.
    """

    def __init__(self, max_size: int = 20, ttl_seconds: int = 1800, session_dir: str | None = None):
        """
        Initialize filesystem session store.

        Args:
            max_size: Maximum number of concurrent sessions (default: 20)
            ttl_seconds: Idle timeout in seconds (default: 1800 = 30 minutes)
            session_dir: Directory for storing session files (default: temp directory)
        """
        if session_dir is None:
            session_dir = str(Path(tempfile.gettempdir()) / "dgcommander-sessions")

        self._session_dir = Path(session_dir)
        self._session_dir.mkdir(parents=True, exist_ok=True)

        self._lock_file = self._session_dir / ".lock"
        self._index_file = self._session_dir / ".index"
        self._local_lock = threading.RLock()

        self._max_size = max_size
        self._ttl = ttl_seconds

    def _acquire_file_lock(self):
        """Acquire filesystem lock for cross-process synchronization."""
        # Create lock file if it doesn't exist
        self._lock_file.touch(exist_ok=True)

        # Use fcntl for Unix-like systems, fallback to simple file creation
        try:
            import fcntl

            lock_fd = os.open(str(self._lock_file), os.O_RDWR)
            fcntl.flock(lock_fd, fcntl.LOCK_EX)
            return lock_fd
        except ImportError:
            # Windows or systems without fcntl - use simpler approach
            return None

    def _release_file_lock(self, lock_fd):
        """Release filesystem lock."""
        if lock_fd is not None:
            try:
                import fcntl

                fcntl.flock(lock_fd, fcntl.LOCK_UN)
                os.close(lock_fd)
            except ImportError:
                pass

    def _read_index(self) -> list[str]:
        """Read session index (access order for LRU)."""
        if not self._index_file.exists():
            return []

        try:
            with open(self._index_file, "rb") as f:
                return pickle.load(f)  # noqa: S301 - Loading trusted session data from our own files
        except Exception:
            return []

    def _write_index(self, access_order: list[str]) -> None:
        """Write session index."""
        with open(self._index_file, "wb") as f:
            pickle.dump(access_order, f)

    def _session_file(self, session_id: str) -> Path:
        """Get path to session file."""
        return self._session_dir / f"{session_id}.session"

    def _hash_credentials(self, credentials: dict) -> str:
        """Generate hash of credentials for deduplication."""
        cred_str = f"{credentials.get('access_key_id')}:{credentials.get('secret_access_key')}:{credentials.get('region')}:{credentials.get('endpoint')}"
        return hashlib.sha256(cred_str.encode()).hexdigest()

    def _is_expired(self, session_data: SessionData) -> bool:
        """Check if session has exceeded idle TTL."""
        return (time.time() - session_data.last_accessed) > self._ttl

    def _load_session(self, session_id: str) -> SessionData | None:
        """Load session data from filesystem."""
        session_file = self._session_file(session_id)

        if not session_file.exists():
            return None

        try:
            with open(session_file, "rb") as f:
                return pickle.load(f)  # noqa: S301 - Loading trusted session data from our own files
        except Exception:
            # Corrupted file, remove it
            session_file.unlink(missing_ok=True)
            return None

    def _save_session(self, session_id: str, session_data: SessionData) -> None:
        """Save session data to filesystem."""
        session_file = self._session_file(session_id)

        with open(session_file, "wb") as f:
            pickle.dump(session_data, f)

    def _delete_session_file(self, session_id: str) -> None:
        """Delete session file from filesystem."""
        session_file = self._session_file(session_id)
        session_file.unlink(missing_ok=True)

    def _update_access_order(self, session_id: str, access_order: list[str]) -> list[str]:
        """Update LRU access order."""
        if session_id in access_order:
            access_order.remove(session_id)
        access_order.append(session_id)
        return access_order

    def _evict_lru(self, access_order: list[str]) -> list[str]:
        """Evict least recently used session."""
        if not access_order:
            return access_order

        lru_session_id = access_order.pop(0)
        self._delete_session_file(lru_session_id)
        return access_order

    def _find_by_credentials_hash_unlocked(
        self, cred_hash: str, access_order: list[str]
    ) -> tuple[str | None, list[str]]:
        """
        Find existing valid session for given credentials (internal, no locking).

        Args:
            cred_hash: Hash of credentials to search for
            access_order: Current access order list

        Returns:
            Tuple of (session_id if found, updated access_order)
        """
        # Check all sessions for matching credentials
        for session_id in list(access_order):
            session_data = self._load_session(session_id)

            if session_data is None:
                # File missing, remove from index
                access_order.remove(session_id)
                continue

            if self._hash_credentials(session_data.credentials) == cred_hash:
                if not self._is_expired(session_data):
                    return session_id, access_order
                else:
                    # Clean up expired session
                    self._delete_session_file(session_id)
                    access_order.remove(session_id)

        return None, access_order

    def find_by_credentials_hash(self, cred_hash: str) -> str | None:
        """
        Find existing valid session for given credentials.

        Args:
            cred_hash: Hash of credentials to search for

        Returns:
            Session ID if valid session exists, None otherwise
        """
        with self._local_lock:
            lock_fd = self._acquire_file_lock()
            try:
                access_order = self._read_index()
                session_id, access_order = self._find_by_credentials_hash_unlocked(cred_hash, access_order)
                self._write_index(access_order)
                return session_id
            finally:
                self._release_file_lock(lock_fd)

    def create_or_reuse(self, credentials: dict, sdk_client: DeltaGliderSDK) -> tuple[str, SessionData]:
        """
        Create new session or return existing session for same credentials.

        Args:
            credentials: AWS credentials dict
            sdk_client: Initialized DeltaGlider SDK client

        Returns:
            Tuple of (session_id, session_data)
        """
        with self._local_lock:
            lock_fd = self._acquire_file_lock()
            try:
                # Check for existing session with same credentials
                cred_hash = self._hash_credentials(credentials)
                access_order = self._read_index()

                # Use unlocked version to avoid deadlock
                existing_id, access_order = self._find_by_credentials_hash_unlocked(cred_hash, access_order)

                if existing_id:
                    # Reuse existing session, update access time
                    session_data = self._load_session(existing_id)
                    if session_data:
                        session_data.last_accessed = time.time()
                        self._save_session(existing_id, session_data)
                        access_order = self._update_access_order(existing_id, access_order)
                        self._write_index(access_order)
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
                if len(access_order) >= self._max_size:
                    access_order = self._evict_lru(access_order)

                self._save_session(session_id, session_data)
                access_order = self._update_access_order(session_id, access_order)
                self._write_index(access_order)

                return session_id, session_data
            finally:
                self._release_file_lock(lock_fd)

    def get(self, session_id: str) -> SessionData | None:
        """
        Get session data and update last_accessed timestamp.

        Args:
            session_id: Session ID to retrieve

        Returns:
            SessionData if session exists and is not expired, None otherwise
        """
        with self._local_lock:
            lock_fd = self._acquire_file_lock()
            try:
                session_data = self._load_session(session_id)

                if not session_data:
                    return None

                if self._is_expired(session_data):
                    # Clean up expired session
                    self._delete_session_file(session_id)
                    access_order = self._read_index()
                    if session_id in access_order:
                        access_order.remove(session_id)
                        self._write_index(access_order)
                    return None

                # Update access time and LRU order
                session_data.last_accessed = time.time()
                self._save_session(session_id, session_data)

                access_order = self._read_index()
                access_order = self._update_access_order(session_id, access_order)
                self._write_index(access_order)

                return session_data
            finally:
                self._release_file_lock(lock_fd)

    def delete(self, session_id: str) -> None:
        """
        Delete a session.

        Args:
            session_id: Session ID to delete
        """
        with self._local_lock:
            lock_fd = self._acquire_file_lock()
            try:
                self._delete_session_file(session_id)

                access_order = self._read_index()
                if session_id in access_order:
                    access_order.remove(session_id)
                    self._write_index(access_order)
            finally:
                self._release_file_lock(lock_fd)

    def cleanup_expired(self) -> int:
        """
        Remove all expired sessions.

        Returns:
            Number of sessions removed
        """
        with self._local_lock:
            lock_fd = self._acquire_file_lock()
            try:
                access_order = self._read_index()
                expired_count = 0

                for session_id in list(access_order):
                    session_data = self._load_session(session_id)

                    if session_data is None or self._is_expired(session_data):
                        self._delete_session_file(session_id)
                        access_order.remove(session_id)
                        expired_count += 1

                self._write_index(access_order)
                return expired_count
            finally:
                self._release_file_lock(lock_fd)

    def count(self) -> int:
        """Get current number of active sessions."""
        with self._local_lock:
            lock_fd = self._acquire_file_lock()
            try:
                access_order = self._read_index()
                return len(access_order)
            finally:
                self._release_file_lock(lock_fd)
