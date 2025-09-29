"""Base models with DRY patterns."""
from __future__ import annotations

from typing import Any, ClassVar, Dict, Optional

from ..common.mixins import (
    AutoSerializableMixin,
    CacheableMixin,
    ComparableMixin,
    TimestampMixin,
    ValidatableMixin,
)


class DomainEntity(
    AutoSerializableMixin,
    ValidatableMixin,
    ComparableMixin,
    TimestampMixin
):
    """Base class for all domain entities."""

    # Class-level configuration
    _entity_name: ClassVar[str] = "entity"
    _id_field: ClassVar[str] = "id"

    def __init__(self, **kwargs):
        super().__init__()
        for key, value in kwargs.items():
            setattr(self, key, value)

    @property
    def id(self) -> Any:
        """Get the entity ID."""
        return getattr(self, self._id_field, None)

    def _comparison_key(self):
        """Use ID for comparison."""
        return (self.__class__.__name__, self.id)

    def validate(self) -> bool:
        """Validate that entity has an ID."""
        return self.id is not None

    def __repr__(self):
        return f"<{self.__class__.__name__} {self._id_field}={self.id}>"


class ValueObject(AutoSerializableMixin, ValidatableMixin, ComparableMixin):
    """Base class for value objects."""

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)
        self.ensure_valid()

    def _comparison_key(self):
        """Compare all attributes for value objects."""
        return tuple(
            getattr(self, k)
            for k in sorted(self.__dict__.keys())
            if not k.startswith('_')
        )


class CachableEntity(DomainEntity, CacheableMixin):
    """Domain entity that can be cached."""

    _cache_ttl: ClassVar[int] = 300  # Default 5 minutes
    _cache_key_attrs: ClassVar[list] = []  # Override in subclasses

    def cache_key(self) -> str:
        """Generate cache key using entity type and ID."""
        return f"{self._entity_name}:{self.id}"


class Repository:
    """Base repository with common operations."""

    def __init__(self, entity_class: type):
        self.entity_class = entity_class
        self._storage: Dict[Any, Any] = {}

    async def find_by_id(self, id: Any) -> Optional[Any]:
        """Find entity by ID."""
        return self._storage.get(id)

    async def find_many(self, filter_func=None) -> list:
        """Find multiple entities."""
        if filter_func is None:
            return list(self._storage.values())
        return [e for e in self._storage.values() if filter_func(e)]

    async def save(self, entity: Any) -> Any:
        """Save entity."""
        entity.touch()  # Update timestamp if available
        self._storage[entity.id] = entity
        return entity

    async def delete(self, id: Any) -> bool:
        """Delete entity."""
        if id in self._storage:
            del self._storage[id]
            return True
        return False

    async def exists(self, id: Any) -> bool:
        """Check if entity exists."""
        return id in self._storage

    async def count(self, filter_func=None) -> int:
        """Count entities."""
        if filter_func is None:
            return len(self._storage)
        return sum(1 for e in self._storage.values() if filter_func(e))


class ApiEndpoint:
    """Base class for API endpoints with common patterns."""

    def __init__(self, repository: Repository):
        self.repository = repository

    async def get_by_id(self, id: Any) -> dict:
        """Get entity by ID."""
        entity = await self.repository.find_by_id(id)
        if entity is None:
            raise ValueError(f"Entity with ID {id} not found")
        return entity.to_dict() if hasattr(entity, 'to_dict') else entity

    async def list_all(self, filter_params: dict = None) -> list:
        """List all entities with optional filtering."""
        filter_func = self._build_filter(filter_params) if filter_params else None
        entities = await self.repository.find_many(filter_func)
        return [e.to_dict() if hasattr(e, 'to_dict') else e for e in entities]

    async def create(self, data: dict) -> dict:
        """Create new entity."""
        entity = self.repository.entity_class(**data)
        saved = await self.repository.save(entity)
        return saved.to_dict() if hasattr(saved, 'to_dict') else saved

    async def update(self, id: Any, data: dict) -> dict:
        """Update existing entity."""
        entity = await self.repository.find_by_id(id)
        if entity is None:
            raise ValueError(f"Entity with ID {id} not found")

        for key, value in data.items():
            setattr(entity, key, value)

        saved = await self.repository.save(entity)
        return saved.to_dict() if hasattr(saved, 'to_dict') else saved

    async def delete(self, id: Any) -> bool:
        """Delete entity."""
        return await self.repository.delete(id)

    def _build_filter(self, params: dict):
        """Build filter function from parameters."""
        def filter_func(entity):
            for key, value in params.items():
                if not hasattr(entity, key):
                    return False
                if getattr(entity, key) != value:
                    return False
            return True
        return filter_func