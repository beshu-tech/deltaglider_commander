"""Background job runner for compute-savings tasks."""

from __future__ import annotations

import threading
import uuid
from concurrent.futures import Future, ThreadPoolExecutor

from ..services.catalog import CatalogService
from ..services.deltaglider import DeltaGliderSDK


class SavingsJobRunner:
    def __init__(self, catalog: CatalogService, sdk: DeltaGliderSDK, *, max_workers: int = 2) -> None:
        self._catalog = catalog
        self._sdk = sdk
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._jobs: dict[str, Future[str]] = {}
        self._lock = threading.RLock()

    def enqueue(self, bucket: str, sdk: DeltaGliderSDK | None = None) -> str:
        """Enqueue a job with optional session-specific SDK."""
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"[ENQUEUE] Called for bucket: {bucket}, SDK provided: {sdk is not None}")

        with self._lock:
            existing = self._jobs.get(bucket)
            if existing and not existing.done():
                logger.info(f"[ENQUEUE] Job already exists and running for bucket: {bucket}")
                return getattr(existing, "job_id", "")

            self._catalog.mark_pending(bucket)
            task_id = uuid.uuid4().hex
            # Use provided SDK (from session) or fallback to container SDK
            effective_sdk = sdk if sdk is not None else self._sdk
            logger.info(f"[ENQUEUE] Using SDK type: {type(effective_sdk).__name__} for task {task_id}")

            future: Future[str] = self._executor.submit(self._run_job, bucket, task_id, effective_sdk)
            future.job_id = task_id
            future.add_done_callback(lambda f, b=bucket: self._finalize(b))
            self._jobs[bucket] = future

            logger.info(f"[ENQUEUE] Job submitted with task_id: {task_id}")
            return task_id

    def _finalize(self, bucket: str) -> None:
        with self._lock:
            future = self._jobs.get(bucket)
            if future and future.done():
                self._jobs.pop(bucket, None)

    def _run_job(self, bucket: str, task_id: str, sdk: DeltaGliderSDK) -> str:
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"[JOB {task_id}] Starting compute-savings job for bucket: {bucket}")
        logger.info(f"[JOB {task_id}] SDK type: {type(sdk).__name__}")

        try:
            # Use list_buckets with compute_stats=True to leverage get_bucket_stats API
            logger.info(f"[JOB {task_id}] Computing bucket stats")
            snapshots = list(sdk.list_buckets(compute_stats=True))

            # Find the snapshot for our bucket
            snapshot = next((s for s in snapshots if s.name == bucket), None)
            if not snapshot:
                raise ValueError(f"Bucket {bucket} not found in list_buckets result")

            logger.info(f"[JOB {task_id}] Stats: objects={snapshot.object_count}, original={snapshot.original_bytes}, stored={snapshot.stored_bytes}, savings={snapshot.savings_pct:.2f}%")

            self._catalog.update_savings(bucket, snapshot)
            logger.info(f"[JOB {task_id}] Successfully updated cache for bucket {bucket}")
            return task_id
        except Exception as e:
            logger.error(f"[JOB {task_id}] Error processing bucket {bucket}: {e}", exc_info=True)
            self._catalog.caches.clear_pending(bucket)
            raise

    def pending(self, bucket: str) -> bool:
        with self._lock:
            future = self._jobs.get(bucket)
            return bool(future and not future.done())
