"""Shared object sorting options."""

from __future__ import annotations

from enum import StrEnum


class ObjectSortOrder(StrEnum):
    """Canonical object sorting options used across API and services."""

    name_asc = "name_asc"
    name_desc = "name_desc"
    modified_desc = "modified_desc"
    modified_asc = "modified_asc"
    size_asc = "size_asc"
    size_desc = "size_desc"

    @classmethod
    def from_query(cls, sort: str | None, direction: str | None) -> ObjectSortOrder:
        """Parse a querystring pair into a known sort order."""
        if not sort:
            return cls.modified_desc

        key = sort.lower()
        dir_normalized = (direction or "desc").lower()

        if key in {"name", "key"}:
            return cls.name_desc if dir_normalized == "desc" else cls.name_asc
        if key in {"size", "original_bytes"}:
            return cls.size_desc if dir_normalized == "desc" else cls.size_asc
        if key == "modified":
            return cls.modified_desc if dir_normalized == "desc" else cls.modified_asc

        return cls.modified_desc


__all__ = ["ObjectSortOrder"]
