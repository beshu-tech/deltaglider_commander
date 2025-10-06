"""Session middleware for extracting and validating sessions."""

from functools import wraps

from flask import g, jsonify, request

from dgcommander.auth import SessionStore


def require_session(f):
    """
    Decorator to require valid session for endpoint access.

    Extracts session ID from cookie, validates session, and injects
    SDK client and credentials into Flask g object.

    Returns 401 if session not found or expired.
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = request.cookies.get("session_id")

        if not session_id:
            return (
                jsonify(
                    {
                        "code": "session_not_found",
                        "message": "No session cookie found",
                    }
                ),
                401,
            )

        session_store: SessionStore = g.session_store
        session_data = session_store.get(session_id)

        if not session_data:
            return (
                jsonify(
                    {
                        "code": "session_expired",
                        "message": "Session expired or invalid",
                    }
                ),
                401,
            )

        # Inject session data into request context
        g.session_id = session_id
        g.sdk_client = session_data.sdk_client
        g.credentials = session_data.credentials

        return f(*args, **kwargs)

    return decorated_function


def require_session_or_env(f):
    """
    Decorator to require valid session OR use container SDK as fallback (test mode only).

    Tries session first, then falls back to container SDK if TEST_MODE is enabled.
    Production code MUST use session-based authentication.
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = request.cookies.get("session_id")

        # Try session-based auth first
        if session_id:
            session_store: SessionStore = g.session_store
            session_data = session_store.get(session_id)

            if session_data:
                # Valid session - use it
                g.session_id = session_id
                g.sdk_client = session_data.sdk_client
                g.credentials = session_data.credentials
                return f(*args, **kwargs)

        # Fallback to container SDK ONLY in test mode
        from flask import current_app

        # Check if test_mode is enabled
        config = g.get("config")
        if config and config.test_mode and "dgcommander" in current_app.extensions:
            services = current_app.extensions["dgcommander"]
            g.sdk_client = services.catalog.sdk
            g.credentials = None  # No credentials when using container SDK
            return f(*args, **kwargs)

        # No valid session and not in test mode - reject
        return (
            jsonify(
                {
                    "code": "session_not_found",
                    "message": "No session cookie found. Please configure S3 credentials in settings.",
                }
            ),
            401,
        )

    return decorated_function
