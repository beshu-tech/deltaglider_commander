"""Use case for listing objects."""
from __future__ import annotations

from typing import Optional

from ...contracts.objects import ObjectListRequest, ObjectListResponse, ObjectSortOrder
from ...domain.repositories import ObjectRepository


class ListObjectsUseCase:
    """Use case for listing objects in a bucket."""

    def __init__(self, object_repository: ObjectRepository):
        self._repository = object_repository

    async def execute(self, request: ObjectListRequest) -> ObjectListResponse:
        """Execute the list objects use case."""
        # Parse sort order
        sort_order = ObjectSortOrder.from_query(request.sort, request.order)

        # Fetch objects from repository
        objects, next_cursor = await self._repository.list_objects(
            bucket=request.bucket,
            prefix=request.prefix,
            limit=request.limit,
            cursor=request.cursor,
            compressed=request.compressed
        )

        # Sort objects based on sort order
        sorted_objects = self._sort_objects(objects, sort_order)

        # Extract common prefixes (directories)
        common_prefixes = self._extract_common_prefixes(sorted_objects, request.prefix)

        return ObjectListResponse(
            objects=sorted_objects,
            common_prefixes=common_prefixes,
            cursor=next_cursor
        )

    def _sort_objects(self, objects: list, sort_order: ObjectSortOrder) -> list:
        """Sort objects based on the specified order."""
        if sort_order == ObjectSortOrder.name_asc:
            return sorted(objects, key=lambda x: x.key)
        elif sort_order == ObjectSortOrder.name_desc:
            return sorted(objects, key=lambda x: x.key, reverse=True)
        elif sort_order == ObjectSortOrder.size_asc:
            return sorted(objects, key=lambda x: x.original_bytes)
        elif sort_order == ObjectSortOrder.size_desc:
            return sorted(objects, key=lambda x: x.original_bytes, reverse=True)
        elif sort_order == ObjectSortOrder.modified_asc:
            return sorted(objects, key=lambda x: x.modified)
        elif sort_order == ObjectSortOrder.modified_desc:
            return sorted(objects, key=lambda x: x.modified, reverse=True)
        return objects

    def _extract_common_prefixes(self, objects: list, prefix: str) -> list[str]:
        """Extract common prefixes (directories) from object keys."""
        prefixes = set()
        prefix_len = len(prefix) if prefix else 0

        for obj in objects:
            key = obj.key
            if prefix and not key.startswith(prefix):
                continue

            # Get the part after the prefix
            remainder = key[prefix_len:].lstrip("/")

            # Find the next "/" to identify directories
            if "/" in remainder:
                dir_name = remainder.split("/")[0]
                full_prefix = f"{prefix}/{dir_name}/" if prefix else f"{dir_name}/"
                prefixes.add(full_prefix)

        return sorted(list(prefixes))