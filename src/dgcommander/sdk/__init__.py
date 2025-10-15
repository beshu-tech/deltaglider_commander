"""DeltaGlider SDK integration package."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def _prefer_local_deltaglider() -> None:
    """Ensure a sibling checkout of deltaglider takes precedence when present."""

    flag = os.environ.get("DGCOMM_DISABLE_LOCAL_DELTAGLIDER", "")
    if flag.lower() in {"1", "true", "yes"}:
        return

    try:
        project_root = Path(__file__).resolve().parents[3]
    except IndexError:
        return

    local_src = project_root / "external" / "deltaglider" / "src"
    if local_src.exists():
        candidate = str(local_src)
        if candidate not in sys.path:
            sys.path.insert(0, candidate)


_prefer_local_deltaglider()

from .adapters.memory import InMemoryDeltaGliderSDK
from .adapters.s3 import S3DeltaGliderSDK, S3Settings
from .models import BucketSnapshot, FileMetadata, LogicalObject, ObjectListing, StatsMode, UploadSummary
from .protocol import DeltaGliderSDK

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
