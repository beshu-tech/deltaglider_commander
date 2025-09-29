"""Use case for uploading objects."""
from __future__ import annotations

import asyncio
from typing import BinaryIO, List, Tuple

from ...contracts.uploads import (
    BatchUploadRequest,
    UploadError,
    UploadResponse,
    UploadResult,
    UploadStats,
)
from ...domain.repositories import ObjectRepository
from ...services.compression_strategy import BatchCompressionAnalyzer


class UploadObjectsUseCase:
    """Use case for uploading objects with optimized compression."""

    def __init__(self, object_repository: ObjectRepository):
        self._repository = object_repository
        self._analyzer = BatchCompressionAnalyzer()

    async def execute_single(
        self,
        bucket: str,
        key: str,
        file_data: bytes,
        prefix: str = "",
        enable_compression: bool = True
    ) -> UploadResponse:
        """Execute single file upload."""
        full_key = f"{prefix}/{key}" if prefix else key

        try:
            # Upload with repository
            object_item = await self._repository.upload_object(
                bucket=bucket,
                key=full_key,
                data=file_data,
                metadata={"compression_enabled": str(enable_compression)}
            )

            # Create result
            result = UploadResult(
                bucket=bucket,
                key=full_key,
                original_bytes=len(file_data),
                stored_bytes=object_item.stored_bytes,
                compressed=object_item.compressed,
                operation="upload_single",
                savings_bytes=len(file_data) - object_item.stored_bytes,
                savings_pct=((len(file_data) - object_item.stored_bytes) / len(file_data)) * 100 if len(file_data) > 0 else 0
            )

            # Create stats
            stats = UploadStats(
                count=1,
                original_bytes=result.original_bytes,
                stored_bytes=result.stored_bytes,
                savings_bytes=result.savings_bytes,
                savings_pct=result.savings_pct,
                average_compression_ratio=1.0 - (result.stored_bytes / result.original_bytes) if result.original_bytes > 0 else 0
            )

            return UploadResponse(
                bucket=bucket,
                prefix=prefix,
                results=[result],
                stats=stats,
                failed=[]
            )

        except Exception as e:
            error = UploadError(
                file_name=key,
                error_code="upload_failed",
                error_message=str(e)
            )

            stats = UploadStats(
                count=0,
                original_bytes=0,
                stored_bytes=0,
                savings_bytes=0,
                savings_pct=0,
                average_compression_ratio=0
            )

            return UploadResponse(
                bucket=bucket,
                prefix=prefix,
                results=[],
                stats=stats,
                failed=[error]
            )

    async def execute_batch(
        self,
        request: BatchUploadRequest,
        files: List[Tuple[str, bytes]]
    ) -> UploadResponse:
        """Execute batch file upload with parallel processing."""
        results = []
        failed = []

        # Create upload tasks
        tasks = []
        for file_name, file_data in files[:request.parallel_uploads]:
            full_key = f"{request.prefix}/{file_name}" if request.prefix else file_name
            task = self._upload_single_async(
                request.bucket,
                full_key,
                file_data,
                request.enable_compression
            )
            tasks.append((file_name, task))

        # Process remaining files in batches
        remaining = files[request.parallel_uploads:]
        while remaining or tasks:
            # Wait for any task to complete
            if tasks:
                done, pending = await asyncio.wait(
                    [task for _, task in tasks],
                    return_when=asyncio.FIRST_COMPLETED
                )

                # Process completed tasks
                for task in done:
                    # Find the corresponding file name
                    for i, (name, t) in enumerate(tasks):
                        if t == task:
                            file_name = name
                            tasks.pop(i)
                            break

                    try:
                        result = await task
                        results.append(result)
                    except Exception as e:
                        error = UploadError(
                            file_name=file_name,
                            error_code="upload_failed",
                            error_message=str(e)
                        )
                        failed.append(error)

            # Start new tasks for remaining files
            while len(tasks) < request.parallel_uploads and remaining:
                file_name, file_data = remaining.pop(0)
                full_key = f"{request.prefix}/{file_name}" if request.prefix else file_name
                task = self._upload_single_async(
                    request.bucket,
                    full_key,
                    file_data,
                    request.enable_compression
                )
                tasks.append((file_name, task))

        # Calculate statistics
        total_original = sum(r.original_bytes for r in results)
        total_stored = sum(r.stored_bytes for r in results)
        total_savings = total_original - total_stored

        stats = UploadStats(
            count=len(results),
            original_bytes=total_original,
            stored_bytes=total_stored,
            savings_bytes=total_savings,
            savings_pct=(total_savings / total_original) * 100 if total_original > 0 else 0,
            average_compression_ratio=1.0 - (total_stored / total_original) if total_original > 0 else 0
        )

        return UploadResponse(
            bucket=request.bucket,
            prefix=request.prefix,
            results=results,
            stats=stats,
            failed=failed
        )

    async def _upload_single_async(
        self,
        bucket: str,
        key: str,
        data: bytes,
        enable_compression: bool
    ) -> UploadResult:
        """Upload a single file asynchronously."""
        object_item = await self._repository.upload_object(
            bucket=bucket,
            key=key,
            data=data,
            metadata={"compression_enabled": str(enable_compression)}
        )

        return UploadResult(
            bucket=bucket,
            key=key,
            original_bytes=len(data),
            stored_bytes=object_item.stored_bytes,
            compressed=object_item.compressed,
            operation="batch_upload",
            savings_bytes=len(data) - object_item.stored_bytes,
            savings_pct=((len(data) - object_item.stored_bytes) / len(data)) * 100 if len(data) > 0 else 0
        )