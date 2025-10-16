"""Presigned URL service for secure downloads."""

from __future__ import annotations

from datetime import UTC, datetime

from ..util.errors import NotFoundError
from ..util.types import PresignedUrlResponse
from .deltaglider import DeltaGliderSDK


class PresignedUrlService:
    """Service for generating presigned URLs with automatic deltaglider rehydration."""

    def __init__(self, sdk: DeltaGliderSDK) -> None:
        self._sdk = sdk

    def generate_presigned_url(
        self, bucket: str, key: str, expires_in: int = 3600, with_rehydration: bool = True
    ) -> PresignedUrlResponse:
        """Generate a presigned URL for downloading an object.

        For deltaglider-compressed files, this will automatically rehydrate
        them to a temporary location before generating the presigned URL.

        Args:
            bucket: S3 bucket name
            key: Object key
            expires_in: URL expiration time in seconds (default: 1 hour)
            with_rehydration: Whether to rehydrate deltaglider files (default: True)

        Returns:
            PresignedUrlResponse with download URL and metadata
        """
        try:
            # Check if object exists and get size estimate
            estimated_size = self._sdk.estimated_object_size(bucket, key)
        except (FileNotFoundError, Exception) as exc:
            # If we can't get the size, it might be because the object doesn't exist
            # or there's an issue with the deltaglider metadata lookup
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to get estimated size for {bucket}/{key}: {exc}")
            raise NotFoundError("object", "key_not_found") from exc

        # Generate presigned URL with rehydration if needed
        if hasattr(self._sdk, "_client"):
            # Real SDK with boto3 client
            if with_rehydration:
                # Use the SDK's new method that handles rehydration automatically
                download_url = self._sdk._client.generate_presigned_url_with_rehydration(
                    Bucket=bucket, Key=key, ExpiresIn=expires_in
                )
            else:
                # Generate standard presigned URL without rehydration
                download_url = self._sdk._client.generate_presigned_url(
                    "get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=expires_in
                )
        else:
            # In-memory SDK for testing - generate a mock URL
            download_url = f"https://s3.amazonaws.com/{bucket}/{key}?X-Amz-Expires={expires_in}"

        # Calculate expiration time
        expires_at = datetime.now(UTC).timestamp() + expires_in

        return PresignedUrlResponse(
            bucket=bucket,
            key=key,
            download_url=download_url,
            expires_in=expires_in,
            expires_at=int(expires_at),
            estimated_bytes=estimated_size,
        )
