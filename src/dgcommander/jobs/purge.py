"""Background job for purging expired temporary files."""

from __future__ import annotations

import logging
import threading
from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..services.deltaglider import DeltaGliderSDK

logger = logging.getLogger(__name__)


class PurgeJobRunner:
    """Background job runner for purging expired temporary files."""

    def __init__(self, sdk: DeltaGliderSDK, interval_seconds: int = 3600) -> None:
        """Initialize the purge job runner.

        Args:
            sdk: DeltaGlider SDK instance
            interval_seconds: How often to run purge (default: 1 hour)
        """
        self._sdk = sdk
        self._interval_seconds = interval_seconds
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._running = False

    def start(self) -> None:
        """Start the background purge job."""
        if self._running:
            logger.warning("Purge job already running")
            return

        self._running = True
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info(f"Started purge job with interval {self._interval_seconds}s")

    def stop(self) -> None:
        """Stop the background purge job."""
        if not self._running:
            return

        logger.info("Stopping purge job...")
        self._running = False
        self._stop_event.set()

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)

        logger.info("Purge job stopped")

    def _run_loop(self) -> None:
        """Main loop for the purge job."""
        while self._running and not self._stop_event.is_set():
            try:
                self._run_purge()
            except Exception as e:
                logger.error(f"Error in purge job: {e}", exc_info=True)

            # Wait for interval or stop event
            self._stop_event.wait(self._interval_seconds)

    def _run_purge(self) -> None:
        """Run a single purge operation across all configured buckets."""
        start_time = datetime.now()
        logger.info("Starting scheduled purge operation")

        total_deleted = 0
        total_size_freed = 0
        errors = []

        # Get list of buckets from SDK
        try:
            buckets_response = self._sdk._client.list_buckets()
            buckets = [b["Name"] for b in buckets_response.get("Buckets", [])]
        except Exception as e:
            logger.error(f"Failed to list buckets: {e}")
            return

        # Purge each bucket
        for bucket in buckets:
            try:
                logger.debug(f"Purging bucket: {bucket}")
                result = self._sdk._client.purge_temp_files(Bucket=bucket)

                total_deleted += result.get("deleted_count", 0)
                total_size_freed += result.get("total_size_freed", 0)

                if result.get("deleted_count", 0) > 0:
                    logger.info(
                        f"Purged {result['deleted_count']} files from {bucket}, "
                        f"freed {result['total_size_freed']} bytes"
                    )

                if result.get("errors"):
                    errors.extend(result["errors"])

            except Exception as e:
                error_msg = f"Failed to purge bucket {bucket}: {e}"
                logger.error(error_msg)
                errors.append(error_msg)

        # Log summary
        duration = (datetime.now() - start_time).total_seconds()
        logger.info(
            f"Purge operation completed in {duration:.2f}s: "
            f"deleted {total_deleted} files, freed {total_size_freed} bytes"
        )

        if errors:
            logger.warning(f"Purge completed with {len(errors)} errors")
            for error in errors[:5]:  # Log first 5 errors
                logger.warning(f"  - {error}")

    def run_once(self) -> dict[str, any]:
        """Run a single purge operation and return results.

        Returns:
            Dict with purge statistics
        """
        self._run_purge()
        # Could enhance to return detailed stats if needed
        return {"status": "completed"}
