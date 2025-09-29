"""Background job runner for compute-savings tasks."""
from __future__ import annotations

import threading
import uuid
from concurrent.futures import Future, ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Dict

from ..services.catalog import CatalogService
from ..services.deltaglider import BucketSnapshot, DeltaGliderSDK


class SavingsJobRunner:
    def __init__(self, catalog: CatalogService, sdk: DeltaGliderSDK, *, max_workers: int = 2) -> None:
        self._catalog = catalog
        self._sdk = sdk
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._jobs: Dict[str, Future[str]] = {}
        self._lock = threading.RLock()

    def enqueue(self, bucket: str) -> str:
        with self._lock:
            existing = self._jobs.get(bucket)
            if existing and not existing.done():
                return getattr(existing, "job_id", "")

            self._catalog.mark_pending(bucket)
            task_id = uuid.uuid4().hex
            future: Future[str] = self._executor.submit(self._run_job, bucket, task_id)
            setattr(future, "job_id", task_id)
            future.add_done_callback(lambda f, b=bucket: self._finalize(b))
            self._jobs[bucket] = future
            return task_id

    def _finalize(self, bucket: str) -> None:
        with self._lock:
            future = self._jobs.get(bucket)
            if future and future.done():
                self._jobs.pop(bucket, None)

    def _run_job(self, bucket: str, task_id: str) -> str:
        try:
            listing = self._sdk.list_objects(bucket, prefix="")
            original = sum(obj.original_bytes for obj in listing.objects)
            stored = sum(obj.stored_bytes for obj in listing.objects)
            object_count = len(listing.objects)
            computed_at = datetime.now(timezone.utc)
            savings_pct = 0.0 if original == 0 else (1.0 - (stored / original)) * 100.0
            snapshot = BucketSnapshot(
                name=bucket,
                object_count=object_count,
                original_bytes=original,
                stored_bytes=stored,
                savings_pct=savings_pct,
                computed_at=computed_at,
            )
            self._catalog.update_savings(bucket, snapshot)
            return task_id
        except Exception:
            self._catalog.caches.clear_pending(bucket)
            raise

    def pending(self, bucket: str) -> bool:
        with self._lock:
            future = self._jobs.get(bucket)
            return bool(future and not future.done())

