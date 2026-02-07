"""Tests for filesystem-based session store."""

import tempfile
import time
from pathlib import Path

import pytest

from dgcommander.auth.filesystem_session_store import FileSystemSessionStore
from dgcommander.sdk.adapters.memory import InMemoryDeltaGliderSDK


@pytest.fixture
def temp_session_dir():
    """Create temporary directory for session files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def store(temp_session_dir, mock_sdk_factory):
    """Create a filesystem session store with temporary directory."""
    return FileSystemSessionStore(
        max_size=5, ttl_seconds=60, session_dir=temp_session_dir, sdk_factory=mock_sdk_factory
    )


@pytest.fixture
def mock_sdk():
    """Create a mock SDK for testing."""
    return InMemoryDeltaGliderSDK(buckets=[], objects={}, blobs={})


@pytest.fixture
def mock_sdk_factory(mock_sdk):
    """Create an SDK factory that always returns the mock SDK."""
    return lambda _credentials: mock_sdk


@pytest.fixture
def credentials():
    """Sample credentials for testing."""
    return {
        "access_key_id": "test_key",
        "secret_access_key": "test_secret",
        "region": "us-east-1",
        "endpoint": "https://s3.amazonaws.com",
    }


def test_create_session(store, credentials, mock_sdk):
    """Test creating a new session."""
    session_id, session_data = store.create_or_reuse(credentials, mock_sdk)

    assert session_id is not None
    assert session_data.credentials == credentials
    assert session_data.sdk_client == mock_sdk
    assert store.count() == 1


def test_get_existing_session(store, credentials, mock_sdk):
    """Test retrieving an existing session."""
    session_id, _ = store.create_or_reuse(credentials, mock_sdk)

    # Get the session
    retrieved = store.get(session_id)

    assert retrieved is not None
    assert retrieved.credentials == credentials


def test_reuse_session_with_same_credentials(store, credentials, mock_sdk):
    """Test that same credentials reuse existing session."""
    session_id1, _ = store.create_or_reuse(credentials, mock_sdk)
    session_id2, _ = store.create_or_reuse(credentials, mock_sdk)

    assert session_id1 == session_id2
    assert store.count() == 1


def test_different_credentials_create_separate_sessions(store, credentials, mock_sdk):
    """Test that different credentials create separate sessions."""
    credentials2 = {**credentials, "access_key_id": "different_key"}

    session_id1, _ = store.create_or_reuse(credentials, mock_sdk)
    session_id2, _ = store.create_or_reuse(credentials2, mock_sdk)

    assert session_id1 != session_id2
    assert store.count() == 2


def test_delete_session(store, credentials, mock_sdk):
    """Test deleting a session."""
    session_id, _ = store.create_or_reuse(credentials, mock_sdk)

    store.delete(session_id)

    assert store.get(session_id) is None
    assert store.count() == 0


def test_session_expiration(credentials, mock_sdk, mock_sdk_factory, temp_session_dir):
    """Test that expired sessions are not returned."""
    # Create store with 1 second TTL
    store = FileSystemSessionStore(
        max_size=5, ttl_seconds=1, session_dir=temp_session_dir, sdk_factory=mock_sdk_factory
    )

    session_id, _ = store.create_or_reuse(credentials, mock_sdk)

    # Wait for expiration
    time.sleep(1.5)

    # Expired session should return None
    assert store.get(session_id) is None
    assert store.count() == 0


def test_lru_eviction(store, mock_sdk):
    """Test LRU eviction when max size is reached."""
    # Create 5 sessions (max size)
    session_ids = []
    for i in range(5):
        creds = {"access_key_id": f"key_{i}", "secret_access_key": "secret", "region": "us-east-1", "endpoint": ""}
        session_id, _ = store.create_or_reuse(creds, mock_sdk)
        session_ids.append(session_id)

    assert store.count() == 5

    # Create 6th session - should evict LRU (first one)
    creds_6 = {"access_key_id": "key_6", "secret_access_key": "secret", "region": "us-east-1", "endpoint": ""}
    store.create_or_reuse(creds_6, mock_sdk)

    assert store.count() == 5
    assert store.get(session_ids[0]) is None  # First session evicted
    assert store.get(session_ids[1]) is not None  # Others still exist


def test_cleanup_expired(credentials, mock_sdk, mock_sdk_factory, temp_session_dir):
    """Test cleanup of expired sessions."""
    # Create store with 1 second TTL
    store = FileSystemSessionStore(
        max_size=5, ttl_seconds=1, session_dir=temp_session_dir, sdk_factory=mock_sdk_factory
    )

    # Create 3 sessions
    for i in range(3):
        creds = {**credentials, "access_key_id": f"key_{i}"}
        store.create_or_reuse(creds, mock_sdk)

    assert store.count() == 3

    # Wait for expiration
    time.sleep(1.5)

    # Cleanup expired sessions
    removed = store.cleanup_expired()

    assert removed == 3
    assert store.count() == 0


def test_session_files_created(store, credentials, mock_sdk, temp_session_dir):
    """Test that session files are actually created on filesystem."""
    session_id, _ = store.create_or_reuse(credentials, mock_sdk)

    # Check that session file exists
    session_file = Path(temp_session_dir) / f"{session_id}.session"
    assert session_file.exists()

    # Check that index file exists
    index_file = Path(temp_session_dir) / ".index"
    assert index_file.exists()


def test_session_persistence_across_store_instances(
    credentials, mock_sdk, mock_sdk_factory, temp_session_dir
):
    """Test that sessions persist across different store instances."""
    # Create session with first store instance
    store1 = FileSystemSessionStore(
        max_size=5, ttl_seconds=60, session_dir=temp_session_dir, sdk_factory=mock_sdk_factory
    )
    session_id, _ = store1.create_or_reuse(credentials, mock_sdk)

    # Create new store instance with same directory
    store2 = FileSystemSessionStore(
        max_size=5, ttl_seconds=60, session_dir=temp_session_dir, sdk_factory=mock_sdk_factory
    )

    # Should be able to retrieve session from new instance
    retrieved = store2.get(session_id)
    assert retrieved is not None
    assert retrieved.credentials == credentials


def test_concurrent_access_safety(store, credentials, mock_sdk):
    """Test that concurrent access doesn't cause issues."""
    import threading

    results = []

    def create_session():
        session_id, _ = store.create_or_reuse(credentials, mock_sdk)
        results.append(session_id)

    # Create 5 threads that all try to create sessions
    threads = [threading.Thread(target=create_session) for _ in range(5)]

    for t in threads:
        t.start()

    for t in threads:
        t.join()

    # All threads should get the same session ID (credential deduplication)
    assert len(set(results)) == 1
    assert store.count() == 1
