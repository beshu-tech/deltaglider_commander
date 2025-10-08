"""Tests for the in-memory DeltaGlider SDK adapter."""

from __future__ import annotations

import io
from datetime import UTC, datetime

import pytest

from dgcommander.sdk.adapters.memory import InMemoryDeltaGliderSDK
from dgcommander.sdk.models import BucketSnapshot, LogicalObject


@pytest.fixture
def memory_sdk():
    """Create an in-memory SDK with test data."""
    bucket = BucketSnapshot(
        name="test-bucket",
        object_count=3,
        original_bytes=300,
        stored_bytes=300,
        savings_pct=0.0,
        computed_at=datetime.now(UTC),
    )

    objects = {
        "test-bucket": [
            LogicalObject(
                key="file1.txt",
                original_bytes=100,
                stored_bytes=100,
                compressed=False,
                modified=datetime.now(UTC),
                physical_key="file1.txt",
            ),
            LogicalObject(
                key="file2.txt",
                original_bytes=100,
                stored_bytes=100,
                compressed=False,
                modified=datetime.now(UTC),
                physical_key="file2.txt",
            ),
            LogicalObject(
                key="file3.txt",
                original_bytes=100,
                stored_bytes=100,
                compressed=False,
                modified=datetime.now(UTC),
                physical_key="file3.txt",
            ),
        ]
    }

    blobs = {
        ("test-bucket", "file1.txt"): b"content1",
        ("test-bucket", "file2.txt"): b"content2",
        ("test-bucket", "file3.txt"): b"content3",
    }

    return InMemoryDeltaGliderSDK(buckets=[bucket], objects=objects, blobs=blobs)


def test_delete_objects_removes_multiple_objects(memory_sdk):
    """Test that delete_objects removes multiple objects correctly."""
    # Delete two objects
    memory_sdk.delete_objects("test-bucket", ["file1.txt", "file2.txt"])

    # Check objects were removed
    listing = memory_sdk.list_objects("test-bucket", "")
    assert len(listing.objects) == 1
    assert listing.objects[0].key == "file3.txt"

    # Check bucket stats were updated
    buckets = list(memory_sdk.list_buckets())
    assert len(buckets) == 1
    assert buckets[0].object_count == 1
    assert buckets[0].original_bytes == 100
    assert buckets[0].stored_bytes == 100


def test_delete_objects_handles_nonexistent_objects(memory_sdk):
    """Test that delete_objects handles missing objects gracefully."""
    # Try to delete a mix of existing and non-existing objects
    memory_sdk.delete_objects("test-bucket", ["file1.txt", "nonexistent.txt", "file2.txt"])

    # Should delete the existing ones and ignore the missing one
    listing = memory_sdk.list_objects("test-bucket", "")
    assert len(listing.objects) == 1
    assert listing.objects[0].key == "file3.txt"


def test_delete_objects_handles_empty_list(memory_sdk):
    """Test that delete_objects handles empty key list."""
    memory_sdk.delete_objects("test-bucket", [])

    # Nothing should change
    listing = memory_sdk.list_objects("test-bucket", "")
    assert len(listing.objects) == 3


def test_delete_objects_handles_nonexistent_bucket(memory_sdk):
    """Test that delete_objects handles missing bucket gracefully."""
    # Should not raise an exception
    memory_sdk.delete_objects("nonexistent-bucket", ["file1.txt"])

    # Original bucket should be unchanged
    listing = memory_sdk.list_objects("test-bucket", "")
    assert len(listing.objects) == 3


def test_delete_objects_normalizes_keys(memory_sdk):
    """Test that delete_objects normalizes keys with leading slashes."""
    # Delete with leading slashes
    memory_sdk.delete_objects("test-bucket", ["/file1.txt", "//file2.txt"])

    # Should still delete the objects
    listing = memory_sdk.list_objects("test-bucket", "")
    assert len(listing.objects) == 1
    assert listing.objects[0].key == "file3.txt"


def test_delete_objects_updates_savings_percentage(memory_sdk):
    """Test that delete_objects recalculates savings percentage correctly."""
    # First upload a compressed object to have non-zero savings
    compressed_data = b"compressed"
    memory_sdk.upload("test-bucket", "compressed.txt", io.BytesIO(compressed_data))

    # Manually update the object to simulate compression
    objects = memory_sdk._objects["test-bucket"]
    for obj in objects:
        if obj.key == "compressed.txt":
            obj.original_bytes = 100  # Simulate original size
            obj.stored_bytes = 10  # Simulate compressed size
            obj.compressed = True
            break

    # Update bucket stats to reflect compression
    for i, bucket in enumerate(memory_sdk._buckets):
        if bucket.name == "test-bucket":
            memory_sdk._buckets[i] = BucketSnapshot(
                name=bucket.name,
                object_count=4,
                original_bytes=400,
                stored_bytes=310,
                savings_pct=22.5,  # (1 - 310/400) * 100
                computed_at=datetime.now(UTC),
            )
            break

    # Delete the uncompressed objects
    memory_sdk.delete_objects("test-bucket", ["file1.txt", "file2.txt", "file3.txt"])

    # Check that savings percentage is recalculated
    buckets = list(memory_sdk.list_buckets())
    assert buckets[0].object_count == 1
    assert buckets[0].original_bytes == 100
    assert buckets[0].stored_bytes == 10
    assert buckets[0].savings_pct == 90.0  # (1 - 10/100) * 100
