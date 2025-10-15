"""
Abstractions for the DeltaGlider SDK integration layer.

This module provides a backward-compatible interface to the refactored SDK package.
All implementations have been moved to dedicated modules for better organization:

- Protocol interface: dgcommander.sdk.protocol
- Data models: dgcommander.sdk.models
- In-memory adapter: dgcommander.sdk.adapters.memory
- S3 adapter: dgcommander.sdk.adapters.s3
"""

from __future__ import annotations

# Re-export everything from the SDK package for backward compatibility
from ..sdk import (
    BucketSnapshot,
    DeltaGliderSDK,
    FileMetadata,
    InMemoryDeltaGliderSDK,
    LogicalObject,
    ObjectListing,
    S3DeltaGliderSDK,
    S3Settings,
    StatsMode,
    UploadSummary,
)

__all__ = [
    "BucketSnapshot",
    "DeltaGliderSDK",
    "FileMetadata",
    "InMemoryDeltaGliderSDK",
    "LogicalObject",
    "ObjectListing",
    "S3DeltaGliderSDK",
    "S3Settings",
    "StatsMode",
    "UploadSummary",
]
