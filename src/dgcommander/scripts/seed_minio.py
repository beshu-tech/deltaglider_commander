"""Utility script to seed a MinIO bucket with sample DeltaGlider objects."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Iterable

import boto3
from botocore.exceptions import ClientError

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


def ensure_bucket(s3_client, bucket: str) -> None:
    try:
        s3_client.head_bucket(Bucket=bucket)
    except ClientError as exc:  # pragma: no cover - defensive network guard
        error_code = exc.response.get("Error", {}).get("Code", "")
        if error_code not in {"404", "NoSuchBucket", "NotFound"}:
            raise
        params = {"Bucket": bucket}
        region = os.getenv("AWS_DEFAULT_REGION")
        if region and region != "us-east-1":
            params["CreateBucketConfiguration"] = {"LocationConstraint": region}
        s3_client.create_bucket(**params)


def object_exists(s3_client, bucket: str, key_candidates: Iterable[str]) -> bool:
    for key in key_candidates:
        try:
            s3_client.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code not in {"404", "NoSuchKey", "NotFound"}:
                raise
    return False


def main() -> int:
    bucket = os.getenv("DGCOMM_SEED_BUCKET", "dg-demo")
    endpoint = os.getenv("DGCOMM_S3_ENDPOINT")
    verify_ssl = _bool_env("DGCOMM_S3_VERIFY_SSL", True)
    cache_dir = os.getenv("DGCOMM_CACHE_DIR", "/tmp/dgcommander-cache")
    region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

    session = boto3.session.Session(region_name=region)
    s3_client = session.client("s3", endpoint_url=endpoint, verify=verify_ssl)

    ensure_bucket(s3_client, bucket)

    client = create_client(endpoint_url=endpoint, cache_dir=cache_dir)

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
        if object_exists(
            s3_client,
            bucket,
            [prefix, f"{prefix}.delta"],
        ):
            print(f"Object already present for {name}, skipping upload")
            continue
        s3_url = f"s3://{bucket}/releases/"
        summary = client.upload(source_path, s3_url)
        print(
            f"Uploaded {name}: stored={summary.stored_size} original={summary.original_size} "
            f"savings={summary.savings_percent:.2f}%",
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

