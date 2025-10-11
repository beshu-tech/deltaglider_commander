from __future__ import annotations

import io
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from dgcommander.sdk.adapters.s3 import S3DeltaGliderSDK, S3Settings


class FakeBotoClient:
    def __init__(self, bucket_names: list[str]):
        self.bucket_names = bucket_names

    def list_buckets(self):
        return {"Buckets": [{"Name": name} for name in self.bucket_names]}


class FakeDeltaClient:
    def __init__(self, bucket_names: list[str]):
        self.bucket_names = bucket_names
        self.objects: dict[str, list[dict]] = {name: [] for name in bucket_names}
        self.stats_calls: list[tuple[str, bool]] = []

    def create_bucket(self, Bucket: str, CreateBucketConfiguration: dict | None = None):
        if Bucket not in self.bucket_names:
            self.bucket_names.append(Bucket)
            self.objects[Bucket] = []

    def delete_bucket(self, Bucket: str):
        if Bucket in self.bucket_names:
            self.bucket_names.remove(Bucket)
            self.objects.pop(Bucket, None)

    def list_buckets(self):
        return {"Buckets": [{"Name": name} for name in self.bucket_names]}

    def put_object(self, Bucket: str, Key: str, Body: bytes):
        now = datetime.now(UTC).isoformat()
        entry = {
            "Key": Key,
            "Size": len(Body),
            "Original": len(Body),
            "LastModified": now,
            "Metadata": {
                "deltaglider-original-size": str(len(Body)),
                "deltaglider-is-delta": "false",
                "deltaglider-compression-ratio": "0.0",
            },
        }
        bucket_objects = self.objects.setdefault(Bucket, [])
        for idx, existing in enumerate(bucket_objects):
            if existing["Key"] == Key:
                bucket_objects[idx] = entry
                break
        else:
            bucket_objects.append(entry)

    def delete_object(self, Bucket: str, Key: str):
        bucket_objects = self.objects.get(Bucket, [])
        self.objects[Bucket] = [obj for obj in bucket_objects if obj["Key"] != Key]

    def delete_objects(self, Bucket: str, Delete: dict):
        keys = {item["Key"] for item in Delete.get("Objects", [])}
        bucket_objects = self.objects.get(Bucket, [])
        self.objects[Bucket] = [obj for obj in bucket_objects if obj["Key"] not in keys]

    def list_objects(
        self,
        Bucket: str,
        Prefix: str = "",
        MaxKeys: int | None = None,
        Delimiter: str | None = None,
        FetchMetadata: bool = False,
        **_: object,
    ) -> dict:
        contents = []
        for obj in self.objects.get(Bucket, []):
            if Prefix and not obj["Key"].startswith(Prefix):
                continue
            contents.append(
                {
                    "Key": obj["Key"],
                    "Size": obj["Size"],
                    "LastModified": obj["LastModified"],
                    "Metadata": obj["Metadata"],
                }
            )
        return {"Contents": contents, "IsTruncated": False, "CommonPrefixes": []}

    def get_object(self, Bucket: str, Key: str):  # pragma: no cover - not used but kept for completeness
        return {"Body": io.BytesIO(b"")}

    def get_bucket_stats(self, bucket: str, detailed_stats: bool = False):
        self.stats_calls.append((bucket, detailed_stats))
        objects = self.objects.get(bucket, [])
        total_size = sum(int(obj["Metadata"]["deltaglider-original-size"]) for obj in objects)
        stored_size = sum(obj["Size"] for obj in objects)
        object_count = len(objects)
        space_saved = total_size - stored_size
        avg_ratio = (space_saved / total_size) if total_size else 0.0
        delta_count = sum(1 for obj in objects if obj["Metadata"]["deltaglider-is-delta"] == "true")
        return SimpleNamespace(
            bucket=bucket,
            object_count=object_count,
            total_size=total_size,
            compressed_size=stored_size,
            space_saved=space_saved,
            average_compression_ratio=avg_ratio,
            delta_objects=delta_count,
            direct_objects=object_count - delta_count,
        )


@pytest.fixture
def fake_environment(monkeypatch):
    bucket_names: list[str] = ["alpha"]
    fake_dg = FakeDeltaClient(bucket_names)
    fake_boto = FakeBotoClient(bucket_names)

    monkeypatch.setattr("boto3.client", lambda *args, **kwargs: fake_boto)

    class DummyConfig:
        def __init__(self, **_: object):
            pass

    monkeypatch.setattr("boto3.session.Config", DummyConfig)
    monkeypatch.setattr("deltaglider.client.create_client", lambda **kwargs: fake_dg)

    return fake_dg


def test_list_buckets_returns_cached_stats(fake_environment):
    fake_dg = fake_environment
    settings = S3Settings()
    sdk = S3DeltaGliderSDK(settings)

    # Initial quick list uses placeholder stats
    quick_snapshot = list(sdk.list_buckets(compute_stats=False))[0]
    assert quick_snapshot.name == "alpha"
    assert quick_snapshot.object_count == 0
    assert quick_snapshot.computed_at is None

    # Populate bucket and trigger refresh via compute
    fake_dg.put_object(Bucket="alpha", Key="foo.txt", Body=b"hello world")
    sdk.compute_bucket_stats("alpha")
    assert fake_dg.stats_calls == [("alpha", True)]

    cached_snapshot = list(sdk.list_buckets(compute_stats=False))[0]
    assert cached_snapshot.object_count == 1
    assert cached_snapshot.original_bytes == len("hello world")
    assert cached_snapshot.computed_at is not None
    # Subsequent quick calls reuse cache
    list(sdk.list_buckets(compute_stats=False))
    assert fake_dg.stats_calls == [("alpha", True)]


def test_upload_refreshes_bucket_cache(fake_environment):
    fake_dg = fake_environment
    settings = S3Settings()
    sdk = S3DeltaGliderSDK(settings)

    # Seed initial state and cache
    fake_dg.put_object(Bucket="alpha", Key="foo.txt", Body=b"hello")
    sdk.compute_bucket_stats("alpha")
    assert fake_dg.stats_calls == [("alpha", True)]

    # Upload new object through SDK (refresh expected)
    sdk.upload("alpha", "bar.txt", io.BytesIO(b"123456"))
    assert fake_dg.stats_calls[-1] == ("alpha", True)

    snapshot = list(sdk.list_buckets(compute_stats=False))[0]
    assert snapshot.object_count == len(fake_dg.objects["alpha"])
    assert snapshot.original_bytes == sum(int(obj["Metadata"]["deltaglider-original-size"]) for obj in fake_dg.objects["alpha"])
    assert snapshot.computed_at is not None
