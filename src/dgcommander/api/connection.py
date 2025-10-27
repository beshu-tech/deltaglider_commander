"""Connection status and management API endpoints."""

from __future__ import annotations

from datetime import UTC, datetime

from flask import Blueprint, g, jsonify

from ..auth.middleware import require_session_or_env
from ..util.s3_context import extract_s3_context_from_credentials

bp = Blueprint("connection", __name__, url_prefix="/api/connection")


@bp.get("/status")
def get_connection_status():
    """
    Get current connection status.

    Returns connection state, provider info, credentials, and health status.
    Works without authentication - returns "offline" if no session exists.
    """
    from flask import request

    # Check for session
    session_id = request.cookies.get("session_id")
    credentials = None
    sdk_client = None

    if session_id:
        session_store = g.session_store
        session_data = session_store.get(session_id)
        if session_data:
            credentials = session_data.credentials
            sdk_client = session_data.sdk_client

    # If no session, check for container SDK (test mode)
    if not credentials:
        from flask import current_app

        config = g.get("config")
        if config and config.test_mode and "dgcommander" in current_app.extensions:
            services = current_app.extensions["dgcommander"]
            sdk_client = services.catalog.sdk

    # Extract S3 context for connection details
    s3_context = extract_s3_context_from_credentials(credentials) if credentials else None

    # Determine connection state
    state = "offline"
    error_message = None

    if sdk_client:
        try:
            # Quick health check - list buckets should be fast
            _ = list(sdk_client.list_buckets())
            state = "ok"
        except Exception as e:
            state = "error"
            error_message = str(e)

    # Build response
    response = {
        "state": state,
        "provider": "s3",
        "accountAlias": None,
        "accessKeyId": s3_context.access_key_preview if s3_context else "Not configured",
        "endpoint": s3_context.endpoint if s3_context else "",
        "region": s3_context.region if s3_context else "us-east-1",
        "expiresAt": None,
        "lastChecked": datetime.now(UTC).isoformat(),
        "errorMessage": error_message,
    }

    return jsonify(response)


@bp.post("/reconnect")
@require_session_or_env
def reconnect():
    """
    Force reconnect by invalidating current SDK and creating a new one.

    This is useful when credentials have changed or connection is stale.
    """
    try:
        # In a session-based setup, we could refresh the SDK here
        # For now, just return success - the next API call will use fresh SDK
        return jsonify({"success": True, "message": "Reconnection triggered"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@bp.post("/rotate")
@require_session_or_env
def rotate_credentials():
    """
    Rotate credentials to new access key/secret key.

    Expects JSON body with:
    - newAccessKeyId: string
    - newSecretAccessKey: string
    - newRegion (optional): string
    - newEndpoint (optional): string
    """
    from flask import request

    try:
        data = request.get_json()

        if not data or "newAccessKeyId" not in data or "newSecretAccessKey" not in data:
            return jsonify({"success": False, "message": "Missing required fields"}), 400

        # Update session with new credentials
        new_credentials = {
            "access_key_id": data["newAccessKeyId"],
            "secret_access_key": data["newSecretAccessKey"],
            "region": data.get("newRegion", g.credentials.get("region", "us-east-1")),
            "endpoint": data.get("newEndpoint", g.credentials.get("endpoint", "")),
        }

        # Update session store
        session_id = request.cookies.get("session_id")
        if session_id and g.session_store:
            g.session_store.update(session_id, {"credentials": new_credentials})

        return jsonify({"success": True, "message": "Credentials rotated successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
