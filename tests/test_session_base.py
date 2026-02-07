"""Tests for BaseSessionStore shared utilities."""

import time

import pytest

from dgcommander.auth.session_base import BaseSessionStore, SessionData
from dgcommander.sdk.adapters.memory import InMemoryDeltaGliderSDK


@pytest.fixture
def base_store():
    """Create a BaseSessionStore instance for testing shared helpers."""
    return BaseSessionStore(max_size=10, ttl_seconds=60)


@pytest.fixture
def mock_sdk():
    return InMemoryDeltaGliderSDK(buckets=[], objects={}, blobs={})


@pytest.fixture
def credentials():
    return {
        "access_key_id": "AKIAIOSFODNN7EXAMPLE",
        "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "region": "us-east-1",
        "endpoint": "https://s3.amazonaws.com",
    }


@pytest.fixture
def session_data(credentials, mock_sdk):
    now = time.time()
    return SessionData(
        credentials=credentials,
        sdk_client=mock_sdk,
        last_accessed=now,
        created_at=now,
    )


class TestHashCredentials:
    def test_consistent_hash(self, base_store, credentials):
        """Same credentials always produce the same hash."""
        h1 = base_store._hash_credentials(credentials)
        h2 = base_store._hash_credentials(credentials)
        assert h1 == h2

    def test_different_access_key_produces_different_hash(self, base_store, credentials):
        creds2 = {**credentials, "access_key_id": "DIFFERENT_KEY"}
        assert base_store._hash_credentials(credentials) != base_store._hash_credentials(creds2)

    def test_different_region_produces_different_hash(self, base_store, credentials):
        creds2 = {**credentials, "region": "eu-west-1"}
        assert base_store._hash_credentials(credentials) != base_store._hash_credentials(creds2)

    def test_different_endpoint_produces_different_hash(self, base_store, credentials):
        creds2 = {**credentials, "endpoint": "https://minio.local:9000"}
        assert base_store._hash_credentials(credentials) != base_store._hash_credentials(creds2)

    def test_hash_is_sha256_hex(self, base_store, credentials):
        h = base_store._hash_credentials(credentials)
        assert len(h) == 64  # SHA-256 hex digest
        assert all(c in "0123456789abcdef" for c in h)

    def test_missing_keys_handled(self, base_store):
        """Credentials with missing keys don't crash."""
        sparse = {"access_key_id": "key"}
        h = base_store._hash_credentials(sparse)
        assert isinstance(h, str) and len(h) == 64


class TestIsExpired:
    def test_fresh_session_not_expired(self, base_store, session_data):
        assert not base_store._is_expired(session_data)

    def test_old_session_is_expired(self, base_store, session_data):
        session_data.last_accessed = time.time() - 120  # 2 min ago, TTL is 60s
        assert base_store._is_expired(session_data)

    def test_boundary_not_expired(self, base_store, session_data):
        session_data.last_accessed = time.time() - 59  # Just under TTL
        assert not base_store._is_expired(session_data)


class TestTouch:
    def test_touch_updates_last_accessed(self, base_store, session_data):
        old_ts = session_data.last_accessed
        time.sleep(0.01)
        base_store._touch(session_data)
        assert session_data.last_accessed > old_ts

    def test_touch_refreshes_expiration(self, base_store, session_data):
        session_data.last_accessed = time.time() - 55  # 5s from expiration
        base_store._touch(session_data)
        assert not base_store._is_expired(session_data)
