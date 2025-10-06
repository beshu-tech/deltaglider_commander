from __future__ import annotations

import sys
from datetime import UTC, datetime
from pathlib import Path

import pytest
import werkzeug

if not hasattr(werkzeug, "__version__"):
    werkzeug.__version__ = "3"  # type: ignore[attr-defined]

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from dgcommander.app import create_app
from dgcommander.deps import DGCommanderConfig, build_services
from dgcommander.services.deltaglider import (
    BucketSnapshot,
    InMemoryDeltaGliderSDK,
    LogicalObject,
)


@pytest.fixture(scope="session")
def sample_sdk() -> InMemoryDeltaGliderSDK:
    blob_path = Path("releases/readonlyrest-1.66.1_es6.8.0.zip")
    # Create dummy test fixture if it doesn't exist (releases/ is gitignored)
    if not blob_path.exists():
        blob_path.parent.mkdir(parents=True, exist_ok=True)
        import zipfile

        with zipfile.ZipFile(blob_path, "w") as zf:
            zf.writestr("readme.txt", "Test fixture file for dgcommander tests")
    blob_bytes = blob_path.read_bytes()
    now = datetime(2024, 1, 1, tzinfo=UTC)
    objects = {
        "releases": [
            LogicalObject(
                key="releases/v1.0.0/app.zip",
                original_bytes=120_000,
                stored_bytes=60_000,
                compressed=True,
                modified=now,
                physical_key="releases/v1.0.0/app.zip",
            ),
            LogicalObject(
                key="releases/v1.0.0/notes.txt",
                original_bytes=4_096,
                stored_bytes=4_096,
                compressed=False,
                modified=now,
                physical_key="releases/v1.0.0/notes.txt",
            ),
            LogicalObject(
                key="logs/2024-01-01.log",
                original_bytes=1_024,
                stored_bytes=1_024,
                compressed=False,
                modified=now,
                physical_key="logs/2024-01-01.log",
            ),
        ]
    }
    stored_total = sum(obj.stored_bytes for obj in objects["releases"])
    original_total = sum(obj.original_bytes for obj in objects["releases"])
    savings_pct = (1.0 - (stored_total / original_total)) * 100.0
    buckets = [
        BucketSnapshot(
            name="releases",
            object_count=len(objects["releases"]),
            original_bytes=original_total,
            stored_bytes=stored_total,
            savings_pct=savings_pct,
            computed_at=now,
        )
    ]
    blobs = {
        ("releases", "releases/v1.0.0/app.zip"): blob_bytes,
        ("releases", "releases/v1.0.0/notes.txt"): b"release notes",
        ("releases", "logs/2024-01-01.log"): b"log entry",
    }
    return InMemoryDeltaGliderSDK(buckets=buckets, objects=objects, blobs=blobs)


@pytest.fixture(scope="session")
def app(sample_sdk: InMemoryDeltaGliderSDK):
    config = DGCommanderConfig(hmac_secret="test-secret")
    services = build_services(config, sample_sdk)
    flask_app = create_app(config=config, services=services)
    flask_app.config.update(TESTING=True)
    yield flask_app


@pytest.fixture()
def client(app):
    return app.test_client()
