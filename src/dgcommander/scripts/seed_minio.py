"""Utility script to seed a MinIO bucket with sample DeltaGlider objects."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

from deltaglider.client import create_client

SEED_FILES = [
    "readonlyrest-1.66.1_es6.8.0.zip",
    "readonlyrest-1.66.1_es7.13.0.zip",
    "readonlyrest-1.66.1_es8.1.0.zip",
]


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    value = value.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    return default


def ensure_bucket(client, bucket: str) -> None:
    """Ensure bucket exists, create if it doesn't."""
    try:
        # Check if bucket exists by trying to list buckets
        response = client.list_buckets()
        bucket_names = [b["Name"] for b in response.get("Buckets", [])]
        if bucket not in bucket_names:
            # Create bucket with region configuration if needed
            region = os.getenv("AWS_DEFAULT_REGION")
            if region and region != "us-east-1":
                client.create_bucket(Bucket=bucket, CreateBucketConfiguration={"LocationConstraint": region})
            else:
                client.create_bucket(Bucket=bucket)
    except Exception:
        # If any error occurs, try to create the bucket anyway
        try:
            client.create_bucket(Bucket=bucket)
        except Exception as e:
            # Bucket might already exist or creation failed
            print(f"Warning: Could not create bucket: {e}")


def object_exists(client, bucket: str, key_candidates: list[str]) -> bool:
    """Check if any of the key candidates exist in the bucket."""
    for key in key_candidates:
        try:
            # Use list_objects to check if object exists
            response = client.list_objects(Bucket=bucket, Prefix=key, MaxKeys=1)
            if response.get("Contents"):
                return True
        except Exception as e:
            # Object doesn't exist or error accessing it, try next candidate
            print(f"Warning: Could not check object {key}: {e}")
            continue
    return False


def main() -> int:
    bucket = os.getenv("DGCOMM_SEED_BUCKET", "dg-demo")
    endpoint = os.getenv("DGCOMM_S3_ENDPOINT")
    cache_dir = os.getenv("DGCOMM_CACHE_DIR") or os.path.join(tempfile.gettempdir(), "dgcommander-cache")

    # Use deltaglider client for all S3 operations including bucket management
    client = create_client(endpoint_url=endpoint, cache_dir=cache_dir)

    ensure_bucket(client, bucket)

    source_root = Path(os.getenv("DGCOMM_SEED_SOURCE", "/app/releases"))
    if not source_root.exists():
        print(f"Seed source directory not found: {source_root}", file=sys.stderr)
        return 1

    for name in SEED_FILES:
        source_path = source_root / name
        if not source_path.exists():
            print(f"Skipping missing seed file: {source_path}")
            continue
        prefix = f"releases/{name}"
        # deltaglider 4.1.0 abstracts .delta suffixes, so just check the logical key
        if object_exists(client, bucket, [prefix]):
            print(f"Object already present for {name}, skipping upload")
            continue
        s3_url = f"s3://{bucket}/releases/"
        summary = client.upload(source_path, s3_url)
        savings_percent = (1.0 - summary.delta_ratio) * 100.0 if summary.is_delta else 0.0
        print(
            f"Uploaded {name}: stored={summary.stored_size} original={summary.original_size} "
            f"savings={savings_percent:.2f}%",
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
