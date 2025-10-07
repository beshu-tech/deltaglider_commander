"""Authentication endpoints for session management."""

import logging

from botocore.exceptions import ClientError
from flask import Blueprint, g, jsonify, request

from dgcommander.auth import SessionStore
from dgcommander.services.deltaglider import S3DeltaGliderSDK, S3Settings

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)


class InvalidCredentialsError(Exception):
    """Raised when AWS credentials are invalid."""

    pass


class S3AccessDeniedError(Exception):
    """Raised when AWS credentials are valid but lack S3 permissions."""

    pass


def _is_secure_request(req) -> bool:
    """Return True when the originating request should be treated as HTTPS."""

    if req.is_secure:
        return True

    forwarded_proto = req.headers.get("X-Forwarded-Proto")
    if forwarded_proto:
        proto = forwarded_proto.split(",")[0].strip().lower()
        if proto == "https":
            return True

    forwarded_ssl = req.headers.get("X-Forwarded-Ssl")
    if forwarded_ssl and forwarded_ssl.strip().lower() in {"on", "1", "true"}:
        return True

    forwarded_scheme = req.headers.get("X-Forwarded-Scheme")
    if forwarded_scheme:
        scheme = forwarded_scheme.split(",")[0].strip().lower()
        if scheme == "https":
            return True

    forwarded = req.headers.get("Forwarded")
    if forwarded:
        for part in forwarded.split(","):
            for segment in part.split(";"):
                segment = segment.strip()
                if segment.lower().startswith("proto="):
                    if segment.split("=", 1)[1].strip().lower() == "https":
                        return True

    return False


def validate_credentials(credentials: dict) -> None:
    """
    Validate AWS credentials by attempting to list buckets.

    Args:
        credentials: Dict with access_key_id, secret_access_key, region, endpoint

    Raises:
        InvalidCredentialsError: If credentials are invalid
        S3AccessDeniedError: If credentials valid but lack permissions
    """
    try:
        # Convert empty strings to None for endpoint (frontend sends "" for AWS S3)
        endpoint = credentials.get("endpoint")
        if endpoint == "":
            endpoint = None

        # Debug logging - mask sensitive data
        logger.info("Validating credentials:")
        logger.info(f"  Access Key: {credentials.get('access_key_id', '')[:8]}...")
        logger.info(f"  Secret Key: {'***' if credentials.get('secret_access_key') else 'MISSING'}")
        logger.info(f"  Region: {credentials.get('region', 'us-east-1')}")
        logger.info(f"  Endpoint: {endpoint or 'DEFAULT AWS'}")
        logger.info(f"  Addressing Style: {credentials.get('addressing_style', 'path')}")

        settings = S3Settings(
            endpoint_url=endpoint,
            region_name=credentials.get("region", "us-east-1"),
            access_key_id=credentials["access_key_id"],
            secret_access_key=credentials["secret_access_key"],
            session_token=credentials.get("session_token"),
            addressing_style=credentials.get("addressing_style", "path"),
            verify=credentials.get("verify", True),
        )

        sdk = S3DeltaGliderSDK(settings)
        # Attempt to list buckets to verify credentials work
        logger.info("Attempting to list buckets for validation...")
        sdk.list_buckets()
        logger.info("Credentials validated successfully")

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_message = e.response["Error"]["Message"]

        logger.error(f"AWS ClientError during validation: {error_code} - {error_message}")
        logger.error(f"Full error response: {e.response}")

        if error_code in ["InvalidAccessKeyId", "SignatureDoesNotMatch"]:
            raise InvalidCredentialsError("Invalid AWS credentials") from e
        elif error_code == "AccessDenied":
            raise S3AccessDeniedError("Valid credentials but insufficient S3 permissions") from e
        else:
            # Re-raise other AWS errors
            raise


@auth_bp.route("/session", methods=["POST"])
def create_session():
    """
    Create or reuse session with AWS credentials.

    Request body:
        {
            "credentials": {
                "access_key_id": "...",
                "secret_access_key": "...",
                "region": "us-east-1",
                "endpoint": "https://s3.amazonaws.com",
                "addressing_style": "path",
                "verify": true
            }
        }

    Returns:
        200: Session created, Set-Cookie header with session_id
        400: Invalid request body
        403: Invalid credentials or access denied
    """
    data = request.get_json()

    logger.info("Received session creation request")
    logger.debug(f"Request data keys: {list(data.keys()) if data else 'None'}")

    if not data or "credentials" not in data:
        logger.warning("Missing credentials in request")
        return jsonify({"code": "invalid_request", "message": "Missing credentials"}), 400

    credentials = data["credentials"]
    logger.debug(f"Credential keys received: {list(credentials.keys())}")

    # Validate required fields
    required = ["access_key_id", "secret_access_key"]
    missing = [f for f in required if f not in credentials]

    if missing:
        return (
            jsonify(
                {
                    "code": "invalid_request",
                    "message": f"Missing required fields: {', '.join(missing)}",
                }
            ),
            400,
        )

    try:
        # Validate credentials against S3
        validate_credentials(credentials)

        # Create SDK client
        # Convert empty strings to None for endpoint (frontend sends "" for AWS S3)
        endpoint = credentials.get("endpoint")
        if endpoint == "":
            endpoint = None

        settings = S3Settings(
            endpoint_url=endpoint,
            region_name=credentials.get("region", "us-east-1"),
            access_key_id=credentials["access_key_id"],
            secret_access_key=credentials["secret_access_key"],
            session_token=credentials.get("session_token"),
            addressing_style=credentials.get("addressing_style", "path"),
            verify=credentials.get("verify", True),
            cache_dir=g.config.s3.cache_dir,  # Use app config for cache dir
        )

        sdk = S3DeltaGliderSDK(settings)

        # Create or reuse session
        session_store: SessionStore = g.session_store
        session_id, session_data = session_store.create_or_reuse(credentials, sdk)

        # Create response with session cookie
        response = jsonify({"message": "Session created", "session_id": session_id})

        response.set_cookie(
            "session_id",
            session_id,
            httponly=True,
            secure=_is_secure_request(request),
            samesite="Lax",
            max_age=g.config.session_idle_ttl if hasattr(g.config, "session_idle_ttl") else 1800,
        )

        return response, 200

    except InvalidCredentialsError as e:
        return (
            jsonify({"code": "invalid_credentials", "message": str(e)}),
            403,
        )

    except S3AccessDeniedError as e:
        return (
            jsonify({"code": "s3_access_denied", "message": str(e)}),
            403,
        )

    except Exception as e:
        return (
            jsonify({"code": "server_error", "message": f"Unexpected error: {str(e)}"}),
            500,
        )


@auth_bp.route("/session", methods=["DELETE"])
def destroy_session():
    """
    Destroy current session.

    Returns:
        204: Session destroyed
        401: No session found
    """
    session_id = request.cookies.get("session_id")

    if not session_id:
        return jsonify({"code": "session_not_found", "message": "No session found"}), 401

    session_store: SessionStore = g.session_store
    session_store.delete(session_id)

    response = jsonify({"message": "Session destroyed"})
    response.set_cookie(
        "session_id",
        "",
        expires=0,
        httponly=True,
        secure=_is_secure_request(request),
        samesite="Lax",
    )

    return response, 204


@auth_bp.route("/session/status", methods=["GET"])
def session_status():
    """
    Check session validity.

    Returns:
        200: Session status
        401: No session or session expired
    """
    session_id = request.cookies.get("session_id")

    if not session_id:
        return jsonify({"code": "session_not_found", "valid": False}), 401

    session_store: SessionStore = g.session_store
    session_data = session_store.get(session_id)

    if not session_data:
        return jsonify({"code": "session_expired", "valid": False}), 401

    # Calculate time until expiry
    import time

    ttl = g.config.session_idle_ttl if hasattr(g.config, "session_idle_ttl") else 1800
    expires_in = int(ttl - (time.time() - session_data.last_accessed))

    return jsonify({"valid": True, "expires_in": max(0, expires_in)}), 200
