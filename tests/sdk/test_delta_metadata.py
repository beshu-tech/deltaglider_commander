from __future__ import annotations

from botocore.exceptions import ClientError

from dgcommander.sdk.adapters._delta_metadata import DeltaMetadataResolver


class StubS3Client:
    def __init__(self, *responses):
        self._responses = list(responses)
        self.calls: list[tuple[str, str]] = []

    def head_object(self, Bucket: str, Key: str):
        self.calls.append((Bucket, Key))
        response = self._responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


def make_client(*responses) -> StubS3Client:
    return StubS3Client(*responses)


def test_resolver_prefers_delta_suffix_when_present():
    client = make_client(
        ClientError({"Error": {"Code": "NoSuchKey"}}, "HeadObject"),
        {"Metadata": {"deltaglider-original-size": "1024"}, "ContentLength": 512},
    )
    resolver = DeltaMetadataResolver(client)

    result = resolver.resolve("bucket", "path/file.txt")

    assert client.calls == [
        ("bucket", "path/file.txt.delta"),
        ("bucket", "path/file.txt"),
    ]
    assert result.physical_key == "path/file.txt"
    assert result.original_bytes == 1024
    assert result.stored_bytes == 512


def test_resolver_returns_empty_metadata_when_all_candidates_fail():
    error = ClientError({"Error": {"Code": "403"}}, "HeadObject")
    client = make_client(error, error)
    resolver = DeltaMetadataResolver(client)

    result = resolver.resolve("bucket", "missing.txt")

    assert result.physical_key is None
    assert result.original_bytes is None
    assert result.stored_bytes is None
