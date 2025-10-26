"""Test S3 context information in error messages."""

from __future__ import annotations

from unittest.mock import Mock, patch

import pytest
from botocore.exceptions import ClientError

from dgcommander.auth.credentials import (
    InvalidCredentialsError,
    S3AccessDeniedError,
    S3ConnectionError,
    validate_credentials,
)
from dgcommander.services.catalog import CatalogService
from dgcommander.util.errors import APIError, SDKError


def test_s3_context_in_bucket_exists_error():
    """Test that bucket_exists errors include S3 context."""
    from dgcommander.sdk.adapters.s3 import S3DeltaGliderSDK, S3Settings

    settings = S3Settings(
        endpoint_url="https://minio.example.com",
        region_name="us-east-1",
        access_key_id="AKIAIOSFODNN7EXAMPLE",
        secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    )
    sdk = S3DeltaGliderSDK(settings)
    catalog = CatalogService(sdk=sdk)

    # Mock the SDK to raise a ClientError
    mock_response = {
        "Error": {
            "Code": "InternalError",
            "Message": "Internal server error",
        }
    }
    error = ClientError(mock_response, "HeadBucket")

    with patch.object(sdk, "bucket_exists", side_effect=error):
        with pytest.raises(SDKError) as exc_info:
            catalog.bucket_exists("test-bucket")

        # Verify S3 context is in error details
        assert exc_info.value.details is not None
        assert "s3_endpoint" in exc_info.value.details
        assert "s3_access_key" in exc_info.value.details
        assert "s3_region" in exc_info.value.details
        assert exc_info.value.details["s3_endpoint"] == "https://minio.example.com"
        assert exc_info.value.details["s3_access_key"] == "AKIAIOSF..."
        assert exc_info.value.details["s3_region"] == "us-east-1"


def test_s3_context_in_create_bucket_error():
    """Test that create_bucket errors include S3 context."""
    from dgcommander.sdk.adapters.s3 import S3DeltaGliderSDK, S3Settings

    settings = S3Settings(
        endpoint_url="https://s3.amazonaws.com",
        region_name="eu-west-1",
        access_key_id="AKIATEST12345678",
        secret_access_key="secret",
    )
    sdk = S3DeltaGliderSDK(settings)
    catalog = CatalogService(sdk=sdk)

    # Mock the SDK to raise a ClientError
    mock_response = {
        "Error": {
            "Code": "BucketAlreadyExists",
            "Message": "Bucket already exists",
        }
    }
    error = ClientError(mock_response, "CreateBucket")

    with patch.object(sdk, "create_bucket", side_effect=error):
        with pytest.raises(APIError) as exc_info:
            catalog.create_bucket("existing-bucket")

        # Verify S3 context is in error details
        assert exc_info.value.details is not None
        assert "s3_endpoint" in exc_info.value.details
        assert "s3_access_key" in exc_info.value.details
        assert exc_info.value.details["s3_endpoint"] == "https://s3.amazonaws.com"
        assert exc_info.value.details["s3_access_key"] == "AKIATEST..."


def test_s3_context_in_delete_bucket_error():
    """Test that delete_bucket errors include S3 context."""
    from dgcommander.sdk.adapters.s3 import S3DeltaGliderSDK, S3Settings

    settings = S3Settings(
        endpoint_url="http://localhost:9000",
        region_name="us-west-2",
        access_key_id="minioadmin",
        secret_access_key="minioadmin",
    )
    sdk = S3DeltaGliderSDK(settings)
    catalog = CatalogService(sdk=sdk)

    # Mock the SDK to raise a ClientError for bucket not found
    mock_response = {
        "Error": {
            "Code": "NoSuchBucket",
            "Message": "The specified bucket does not exist",
        }
    }
    error = ClientError(mock_response, "DeleteBucket")

    with patch.object(sdk, "delete_bucket", side_effect=error):
        with pytest.raises(APIError) as exc_info:
            catalog.delete_bucket("missing-bucket")

        # Verify S3 context is in error details
        assert exc_info.value.details is not None
        assert "s3_endpoint" in exc_info.value.details
        assert "s3_access_key" in exc_info.value.details
        assert exc_info.value.details["s3_endpoint"] == "http://localhost:9000"
        assert exc_info.value.details["s3_access_key"] == "minioadm..."


def test_s3_context_in_delete_object_error():
    """Test that delete_object errors include S3 context."""
    from dgcommander.sdk.adapters.s3 import S3DeltaGliderSDK, S3Settings

    settings = S3Settings(
        endpoint_url="https://storage.example.com",
        region_name="ap-south-1",
        access_key_id="ACCESS123456",
        secret_access_key="secret",
    )
    sdk = S3DeltaGliderSDK(settings)
    catalog = CatalogService(sdk=sdk)

    # Mock the SDK to raise a ClientError
    mock_response = {
        "Error": {
            "Code": "NoSuchKey",
            "Message": "The specified key does not exist",
        }
    }
    error = ClientError(mock_response, "DeleteObject")

    with patch.object(sdk, "delete_object", side_effect=error):
        with pytest.raises(APIError) as exc_info:
            catalog.delete_object("bucket", "missing-key")

        # Verify S3 context is in error details
        assert exc_info.value.details is not None
        assert "s3_endpoint" in exc_info.value.details
        assert "s3_access_key" in exc_info.value.details
        assert exc_info.value.details["s3_endpoint"] == "https://storage.example.com"
        assert exc_info.value.details["s3_access_key"] == "ACCESS12..."


def test_s3_context_in_upload_access_denied():
    """Test that upload errors include S3 context."""
    from io import BytesIO

    from dgcommander.sdk.adapters.s3 import S3DeltaGliderSDK, S3Settings

    settings = S3Settings(
        endpoint_url="https://s3.eu-central-1.amazonaws.com",
        region_name="eu-central-1",
        access_key_id="AKIAREADONLY",
        secret_access_key="secret",
    )
    sdk = S3DeltaGliderSDK(settings)
    catalog = CatalogService(sdk=sdk)

    # Mock the SDK to raise an AccessDenied error
    mock_response = {
        "Error": {
            "Code": "AccessDenied",
            "Message": "Access Denied",
        }
    }
    error = ClientError(mock_response, "PutObject")

    file_obj = BytesIO(b"test content")

    with patch.object(sdk, "upload", side_effect=error):
        with pytest.raises(APIError) as exc_info:
            catalog.upload_object("bucket", "key", file_obj)

        # Verify S3 context is in error details
        assert exc_info.value.details is not None
        assert "s3_endpoint" in exc_info.value.details
        assert "s3_access_key" in exc_info.value.details
        assert exc_info.value.details["s3_endpoint"] == "https://s3.eu-central-1.amazonaws.com"
        assert exc_info.value.details["s3_access_key"] == "AKIAREAD..."


def test_s3_context_in_upload_generic_access_denied():
    """Test that generic AccessDenied errors include S3 context."""
    from io import BytesIO

    from dgcommander.sdk.adapters.s3 import S3DeltaGliderSDK, S3Settings

    settings = S3Settings(
        endpoint_url="https://hetzner.s3.eu-central-1.amazonaws.com",
        region_name="eu-central-1",
        access_key_id="HETZNERKEY123",
        secret_access_key="secret",
    )
    sdk = S3DeltaGliderSDK(settings)
    catalog = CatalogService(sdk=sdk)

    # Mock the SDK to raise a generic exception with AccessDenied message
    error = Exception("An error occurred (AccessDenied) when calling the PutObject operation")

    file_obj = BytesIO(b"test content")

    with patch.object(sdk, "upload", side_effect=error):
        with pytest.raises(APIError) as exc_info:
            catalog.upload_object("bucket", "key", file_obj)

        # Verify S3 context is in error details
        assert exc_info.value.code == "s3_access_denied"
        assert exc_info.value.details is not None
        assert "s3_endpoint" in exc_info.value.details
        assert "s3_access_key" in exc_info.value.details
        assert exc_info.value.details["s3_endpoint"] == "https://hetzner.s3.eu-central-1.amazonaws.com"
        assert exc_info.value.details["s3_access_key"] == "HETZNERK..."


def test_credentials_validation_errors_include_context():
    """Test that credential validation errors include S3 context."""
    credentials = {
        "access_key_id": "AKIAINVALID123",
        "secret_access_key": "invalidsecret",
        "endpoint": "https://custom.s3.example.com",
        "region": "eu-north-1",
    }

    # Mock the SDK to raise an InvalidAccessKeyId error
    mock_response = {
        "Error": {
            "Code": "InvalidAccessKeyId",
            "Message": "The AWS Access Key Id you provided does not exist",
        }
    }
    error = ClientError(mock_response, "ListBuckets")

    with patch("dgcommander.auth.credentials.create_sdk_from_credentials") as mock_create:
        mock_sdk = Mock()
        mock_sdk.list_buckets.side_effect = error
        mock_create.return_value = mock_sdk

        with pytest.raises(InvalidCredentialsError) as exc_info:
            validate_credentials(credentials)

        # Verify S3 context is in error message
        error_msg = str(exc_info.value)
        assert "endpoint: https://custom.s3.example.com" in error_msg
        assert "key: AKIAINVA..." in error_msg


def test_credentials_access_denied_includes_context():
    """Test that access denied errors include S3 context."""
    credentials = {
        "access_key_id": "AKIADENIED456",
        "secret_access_key": "secret",
        "endpoint": "https://restricted.s3.example.com",
        "region": "ap-southeast-2",
    }

    # Mock the SDK to raise an AccessDenied error
    mock_response = {
        "Error": {
            "Code": "AccessDenied",
            "Message": "Access Denied",
        }
    }
    error = ClientError(mock_response, "ListBuckets")

    with patch("dgcommander.auth.credentials.create_sdk_from_credentials") as mock_create:
        mock_sdk = Mock()
        mock_sdk.list_buckets.side_effect = error
        mock_create.return_value = mock_sdk

        with pytest.raises(S3AccessDeniedError) as exc_info:
            validate_credentials(credentials)

        # Verify S3 context is in error message
        error_msg = str(exc_info.value)
        assert "endpoint: https://restricted.s3.example.com" in error_msg
        assert "key: AKIADENI..." in error_msg


def test_credentials_connection_error_includes_context():
    """Test that connection errors include S3 context."""
    from botocore.exceptions import EndpointConnectionError

    credentials = {
        "access_key_id": "AKIAOFFLINE789",
        "secret_access_key": "secret",
        "endpoint": "https://offline.s3.example.com",
        "region": "ca-central-1",
    }

    # Mock the SDK to raise an EndpointConnectionError
    error = EndpointConnectionError(endpoint_url="https://offline.s3.example.com")

    with patch("dgcommander.auth.credentials.create_sdk_from_credentials") as mock_create:
        mock_sdk = Mock()
        mock_sdk.list_buckets.side_effect = error
        mock_create.return_value = mock_sdk

        with pytest.raises(S3ConnectionError) as exc_info:
            validate_credentials(credentials)

        # Verify S3 context is in error message
        error_msg = str(exc_info.value)
        assert "endpoint: https://offline.s3.example.com" in error_msg
        assert "key: AKIAOFFL..." in error_msg
