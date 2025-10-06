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
    Decorator to require valid session for endpoint access.

    Alias for require_session for backward compatibility.
    Environment variable fallback has been removed - sessions are required.
    """
    return require_session(f)
