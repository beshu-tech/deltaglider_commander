"""Test download API endpoints."""


def test_generate_presigned_url(app, client):
    """Test generating a presigned URL for download."""
    response = client.post(
        "/api/download/presigned-url",
        json={"bucket": "releases", "key": "releases/v1.0.0/app.zip", "expires_in": 3600},
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "download_url" in data
    assert "expires_in" in data
    assert "expires_at" in data
    assert "estimated_bytes" in data
    assert data["bucket"] == "releases"
    assert data["key"] == "releases/v1.0.0/app.zip"
    assert data["expires_in"] == 3600
    # URL should be a valid S3 presigned URL
    assert data["download_url"].startswith("https://")
    assert "releases/v1.0.0/app.zip" in data["download_url"]


def test_generate_presigned_url_unknown_object_returns_404(client):
    """Test that generating presigned URL for unknown object returns 404."""
    response = client.post(
        "/api/download/presigned-url",
        json={"bucket": "releases", "key": "unknown.txt"},
    )
    assert response.status_code == 404
    data = response.get_json()
    assert data["error"]["code"] == "key_not_found"


def test_generate_presigned_url_invalid_expires_in(client):
    """Test that invalid expires_in values are rejected."""
    # Too short
    response = client.post(
        "/api/download/presigned-url",
        json={"bucket": "releases", "key": "app.zip", "expires_in": 30},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "expires_in must be between" in data["error"]["message"]

    # Too long
    response = client.post(
        "/api/download/presigned-url",
        json={"bucket": "releases", "key": "app.zip", "expires_in": 1000000},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "expires_in must be between" in data["error"]["message"]


def test_generate_presigned_url_missing_parameters(client):
    """Test that missing required parameters are rejected."""
    # Missing bucket
    response = client.post(
        "/api/download/presigned-url",
        json={"key": "app.zip"},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "bucket and key are required" in data["error"]["message"]

    # Missing key
    response = client.post(
        "/api/download/presigned-url",
        json={"bucket": "releases"},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "bucket and key are required" in data["error"]["message"]
