"""APScheduler-based purge job for cleaning up expired temporary files."""

from __future__ import annotations

import fcntl
import logging
import os
from pathlib import Path
from typing import IO

from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.job import Job
from apscheduler.schedulers.background import BackgroundScheduler

from ..sdk.protocol import DeltaGliderSDK

logger = logging.getLogger(__name__)


class PurgeScheduler:
    """Manages scheduled purging of expired temporary files using APScheduler.

    This implementation uses filesystem-based locking to ensure only one process
    runs the scheduler at a time, making it safe for multi-worker deployments.
    """

    def __init__(self, sdk: DeltaGliderSDK, interval_hours: int = 1):
        self._sdk = sdk
        self._interval_hours = interval_hours
        self._scheduler: BackgroundScheduler | None = None
        self._job: Job | None = None
        self._lock_file: IO | None = None
        self._lock_path = Path(os.environ.get("DGCOMM_CACHE_DIR", "/tmp/dgcommander-cache")) / "purge_scheduler.lock"

    def start(self) -> bool:
        """Start the scheduler. Returns True if started, False if already running."""
        if self._scheduler and self._scheduler.running:
            logger.info("Purge scheduler already running in this process")
            return False

        # Try to acquire exclusive lock using filesystem
        try:
            # Create lock directory if it doesn't exist
            self._lock_path.parent.mkdir(parents=True, exist_ok=True)

            # Try to open and lock the file
            self._lock_file = open(self._lock_path, "w")

            # Try to acquire exclusive non-blocking lock
            fcntl.flock(self._lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)

            # Write PID to lock file for debugging
            self._lock_file.write(f"{os.getpid()}\n")
            self._lock_file.flush()

            logger.info(f"Acquired exclusive lock for purge scheduler (PID: {os.getpid()})")

        except OSError:
            # Another process has the lock
            logger.info("Another process is already running the purge scheduler")
            if self._lock_file:
                self._lock_file.close()
                self._lock_file = None
            return False
        except Exception as e:
            logger.error(f"Failed to acquire lock: {e}")
            if self._lock_file:
                self._lock_file.close()
                self._lock_file = None
            return False

        try:
            # Create scheduler with memory job store (since we're using file locking for coordination)
            self._scheduler = BackgroundScheduler(
                executors={
                    "default": ThreadPoolExecutor(1)  # Single thread for purge jobs
                },
                job_defaults={
                    "coalesce": True,  # Coalesce missed jobs
                    "max_instances": 1,  # Only one instance at a time
                    "misfire_grace_time": 300,  # 5 minutes grace time
                },
            )

            # Add the purge job
            self._job = self._scheduler.add_job(
                func=self._run_purge,
                trigger="interval",
                minutes=self._interval_hours,
                id="purge_temp_files",
                name="Purge temporary files",
                replace_existing=True,
            )

            # Start the scheduler
            self._scheduler.start()
            logger.info(f"Purge scheduler started with {self._interval_hours} hour interval")

            # Run immediately on startup
            self._scheduler.add_job(
                func=self._run_purge, id="purge_temp_files_startup", name="Initial purge on startup"
            )

            return True

        except Exception as e:
            logger.error(f"Failed to start purge scheduler: {e}")
            # Release lock if scheduler fails to start
            self._release_lock()
            return False

    def stop(self) -> None:
        """Stop the scheduler gracefully."""
        if self._scheduler and self._scheduler.running:
            logger.info("Stopping purge scheduler...")
            self._scheduler.shutdown(wait=True)
            self._scheduler = None
            self._job = None
            logger.info("Purge scheduler stopped")

        # Release the filesystem lock
        self._release_lock()

    def _release_lock(self) -> None:
        """Release the filesystem lock."""
        if self._lock_file:
            try:
                fcntl.flock(self._lock_file.fileno(), fcntl.LOCK_UN)
                self._lock_file.close()
                logger.info("Released purge scheduler lock")
            except Exception as e:
                logger.error(f"Error releasing lock: {e}")
            finally:
                self._lock_file = None

    def _run_purge(self) -> None:
        """Execute the purge operation."""
        logger.info("Starting scheduled purge of temporary files")

        try:
            # List all buckets
            buckets_response = self._sdk.list_buckets()
            buckets = buckets_response.buckets if hasattr(buckets_response, "buckets") else []

            total_deleted = 0

            for bucket in buckets:
                bucket_name = bucket.name if hasattr(bucket, "name") else str(bucket)
                logger.info(f"Purging temporary files in bucket: {bucket_name}")

                try:
                    # Call the DeltaGlider client's purge method
                    if hasattr(self._sdk, "_client") and hasattr(self._sdk._client, "purge_temp_files"):
                        result = self._sdk._client.purge_temp_files(bucket_name)
                        deleted_count = result.get("deleted_count", 0)
                        total_deleted += deleted_count
                        logger.info(f"Deleted {deleted_count} files from {bucket_name}")
                    else:
                        logger.warning("SDK does not support purge_temp_files")

                except Exception as e:
                    logger.error(f"Failed to purge bucket {bucket_name}: {e}")

            logger.info(f"Purge completed. Total files deleted: {total_deleted}")

        except Exception as e:
            logger.error(f"Failed to run purge: {e}")

    def get_next_run_time(self) -> str | None:
        """Get the next scheduled run time."""
        if self._job:
            next_run = self._job.next_run_time
            return next_run.isoformat() if next_run else None
        return None
