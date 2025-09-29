from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dgcommander.services.deltaglider import S3DeltaGliderSDK, S3Settings
from deltaglider.ports.storage import ObjectHead


@pytest.fixture()
def s3_sdk(tmp_path):
    settings = S3Settings(cache_dir=str(tmp_path), verify=False)
    return S3DeltaGliderSDK(settings)


def test_logical_from_head_delta(s3_sdk):
    head = ObjectHead(
        key="releases/v1.0.0/app.zip.delta",
        size=1024,
        etag="etag",
        last_modified=datetime(2024, 1, 1, tzinfo=timezone.utc),
        metadata={
            "original_name": "app.zip",
            "file_size": "2048",
            "delta_size": "1024",
        },
    )
    logical = s3_sdk._logical_from_head("demo", head)
    assert logical is not None
    assert logical.key == "releases/v1.0.0/app.zip"
    assert logical.physical_key == "releases/v1.0.0/app.zip.delta"
    assert logical.original_bytes == 2048
    assert logical.stored_bytes == 1024
    assert logical.compressed is True


def test_resolve_head_handles_delta_suffix(monkeypatch, s3_sdk):
    head = ObjectHead(
        key="releases/v1.0.0/app.zip.delta",
        size=1024,
        etag="etag",
        last_modified=datetime(2024, 1, 1, tzinfo=timezone.utc),
        metadata={
            "original_name": "app.zip",
            "file_size": "2048",
            "delta_size": "1024",
        },
    )

    def fake_head(key: str):  # noqa: ANN001
        if key.endswith("app.zip.delta"):
            return head
        return None

    class StorageStub:
        @staticmethod
        def head(key: str):  # noqa: ANN001
            return fake_head(key)

    monkeypatch.setattr(s3_sdk, "_storage", StorageStub())
    resolved_head, logical = s3_sdk._resolve_head("demo", "releases/v1.0.0/app.zip")
    assert resolved_head is head
    assert logical.physical_key.endswith(".delta")
    assert logical.key.endswith("app.zip")


def test_logical_from_head_direct_sets_flags(s3_sdk):
    head = ObjectHead(
        key="documents/readme.txt",
        size=512,
        etag="etag",
        last_modified=datetime(2024, 5, 1, tzinfo=timezone.utc),
        metadata={
            "file_size": "512",
            "compression": "none",
        },
    )
    logical = s3_sdk._logical_from_head("demo", head)
    assert logical is not None
    assert logical.key == "documents/readme.txt"
    assert logical.compressed is False
    assert logical.original_bytes == 512
    assert logical.stored_bytes == 512
