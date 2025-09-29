"""Repository interfaces for domain layer."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from ..contracts.buckets import BucketStats
from ..contracts.objects import ObjectItem

T = TypeVar("T")


class Repository(ABC, Generic[T]):
    """Base repository interface."""

    @abstractmethod
    async def find_by_id(self, id: str) -> T | None:
        """Find entity by ID."""
        ...

    @abstractmethod
    async def find_many(self, filter: dict) -> list[T]:
        """Find multiple entities matching filter."""
        ...

    @abstractmethod
    async def save(self, entity: T) -> T:
        """Save entity."""
        ...

    @abstractmethod
    async def delete(self, id: str) -> bool:
        """Delete entity by ID."""
        ...

    @abstractmethod
    async def exists(self, id: str) -> bool:
        """Check if entity exists."""
        ...


class ObjectRepository(ABC):
    """Repository interface for object operations."""

    @abstractmethod
    async def list_objects(
        self, bucket: str, prefix: str = "", limit: int = 100, cursor: str | None = None, compressed: bool | None = None
    ) -> tuple[list[ObjectItem], str | None]:
        """List objects with pagination."""
        ...

    @abstractmethod
    async def get_object_metadata(self, bucket: str, key: str) -> ObjectItem | None:
        """Get object metadata."""
        ...

    @abstractmethod
    async def delete_object(self, bucket: str, key: str) -> bool:
        """Delete an object."""
        ...

    @abstractmethod
    async def upload_object(self, bucket: str, key: str, data: bytes, metadata: dict) -> ObjectItem:
        """Upload an object."""
        ...

    @abstractmethod
    async def download_object(self, bucket: str, key: str) -> bytes:
        """Download object data."""
        ...

    @abstractmethod
    async def stream_object(self, bucket: str, key: str, chunk_size: int = 8192):
        """Stream object data in chunks."""
        ...


class BucketRepository(ABC):
    """Repository interface for bucket operations."""

    @abstractmethod
    async def list_buckets(self) -> list[BucketStats]:
        """List all buckets."""
        ...

    @abstractmethod
    async def get_bucket(self, name: str) -> BucketStats | None:
        """Get bucket by name."""
        ...

    @abstractmethod
    async def create_bucket(self, name: str, region: str = "us-east-1") -> BucketStats:
        """Create a new bucket."""
        ...

    @abstractmethod
    async def delete_bucket(self, name: str, force: bool = False) -> bool:
        """Delete a bucket."""
        ...

    @abstractmethod
    async def bucket_exists(self, name: str) -> bool:
        """Check if bucket exists."""
        ...

    @abstractmethod
    async def compute_bucket_savings(self, name: str) -> BucketStats:
        """Compute savings for a bucket."""
        ...


class CacheRepository(ABC):
    """Repository interface for cache operations."""

    @abstractmethod
    async def get(self, key: str) -> any | None:
        """Get cached value."""
        ...

    @abstractmethod
    async def set(self, key: str, value: any, ttl: int | None = None) -> None:
        """Set cached value with optional TTL."""
        ...

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete cached value."""
        ...

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        ...

    @abstractmethod
    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern."""
        ...

    @abstractmethod
    async def get_many(self, keys: list[str]) -> dict:
        """Get multiple cached values."""
        ...

    @abstractmethod
    async def set_many(self, items: dict, ttl: int | None = None) -> None:
        """Set multiple cached values."""
        ...
