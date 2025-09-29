"""Reusable mixins for DRY pattern implementation."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, Type, TypeVar

T = TypeVar('T')


class AutoSerializableMixin:
    """Mixin for automatic serialization to dict and JSON."""

    def to_dict(self) -> dict:
        """Convert object to dictionary."""
        result = {}
        for key, value in self.__dict__.items():
            if key.startswith('_'):
                continue  # Skip private attributes

            if hasattr(value, 'to_dict'):
                result[key] = value.to_dict()
            elif isinstance(value, datetime):
                result[key] = value.isoformat().replace("+00:00", "Z")
            elif isinstance(value, (list, tuple)):
                result[key] = [
                    item.to_dict() if hasattr(item, 'to_dict') else item
                    for item in value
                ]
            elif isinstance(value, dict):
                result[key] = {
                    k: v.to_dict() if hasattr(v, 'to_dict') else v
                    for k, v in value.items()
                }
            else:
                result[key] = value

        return result

    def to_json(self, **kwargs) -> str:
        """Convert object to JSON string."""
        return json.dumps(self.to_dict(), **kwargs)

    @classmethod
    def from_dict(cls: Type[T], data: dict) -> T:
        """Create instance from dictionary."""
        return cls(**data)

    @classmethod
    def from_json(cls: Type[T], json_str: str) -> T:
        """Create instance from JSON string."""
        return cls.from_dict(json.loads(json_str))


class ComparableMixin:
    """Mixin for objects that need comparison operations."""

    def _comparison_key(self):
        """Return key for comparison. Override in subclasses."""
        return str(self)

    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return NotImplemented
        return self._comparison_key() == other._comparison_key()

    def __lt__(self, other):
        if not isinstance(other, self.__class__):
            return NotImplemented
        return self._comparison_key() < other._comparison_key()

    def __le__(self, other):
        return self == other or self < other

    def __gt__(self, other):
        if not isinstance(other, self.__class__):
            return NotImplemented
        return self._comparison_key() > other._comparison_key()

    def __ge__(self, other):
        return self == other or self > other

    def __hash__(self):
        return hash(self._comparison_key())


class CacheableMixin:
    """Mixin for objects that can be cached."""

    def cache_key(self) -> str:
        """Generate cache key for this object."""
        class_name = self.__class__.__name__
        # Use important attributes for key generation
        key_attrs = getattr(self, '_cache_key_attrs', [])
        if not key_attrs:
            # Default to all non-private attributes
            key_attrs = [k for k in self.__dict__.keys() if not k.startswith('_')]

        key_parts = [class_name]
        for attr in key_attrs:
            value = getattr(self, attr, None)
            if value is not None:
                key_parts.append(f"{attr}={value}")

        return ":".join(key_parts)

    def cache_ttl(self) -> int:
        """Return TTL for caching this object."""
        return getattr(self, '_cache_ttl', 300)  # Default 5 minutes

    def cache_tags(self) -> Dict[str, str]:
        """Return tags for cache entry."""
        return getattr(self, '_cache_tags', {})


class ValidatableMixin:
    """Mixin for objects that need validation."""

    def validate(self) -> bool:
        """Validate the object. Override in subclasses."""
        return True

    def validation_errors(self) -> list[str]:
        """Return list of validation errors."""
        errors = []
        # Override this in subclasses to provide specific validation
        if not self.validate():
            errors.append(f"{self.__class__.__name__} validation failed")
        return errors

    def ensure_valid(self):
        """Raise exception if object is not valid."""
        errors = self.validation_errors()
        if errors:
            raise ValueError(f"Validation failed: {'; '.join(errors)}")


class TimestampMixin:
    """Mixin for objects that need timestamp tracking."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def touch(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow()

    @property
    def age_seconds(self) -> float:
        """Get age of object in seconds."""
        return (datetime.utcnow() - self.created_at).total_seconds()


class MetricsMixin:
    """Mixin for objects that track metrics."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._metrics = {}

    def record_metric(self, name: str, value: Any):
        """Record a metric value."""
        if name not in self._metrics:
            self._metrics[name] = []
        self._metrics[name].append((datetime.utcnow(), value))

    def get_metric(self, name: str) -> list:
        """Get all values for a metric."""
        return self._metrics.get(name, [])

    def get_latest_metric(self, name: str) -> Any:
        """Get the latest value for a metric."""
        values = self.get_metric(name)
        return values[-1][1] if values else None

    def get_metrics_summary(self) -> dict:
        """Get summary of all metrics."""
        summary = {}
        for name, values in self._metrics.items():
            if not values:
                continue

            numeric_values = [v for _, v in values if isinstance(v, (int, float))]
            if numeric_values:
                summary[name] = {
                    "count": len(values),
                    "latest": values[-1][1],
                    "min": min(numeric_values),
                    "max": max(numeric_values),
                    "avg": sum(numeric_values) / len(numeric_values)
                }
            else:
                summary[name] = {
                    "count": len(values),
                    "latest": values[-1][1]
                }

        return summary