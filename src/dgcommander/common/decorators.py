"""Common decorators for DRY pattern implementation."""

from __future__ import annotations

import functools
import time
from collections.abc import Callable
from typing import TypeVar

from flask import jsonify, request
from pydantic import BaseModel, ValidationError

from ..contracts.base import ErrorDetail, ErrorResponse
from ..util.errors import APIError, NotFoundError

T = TypeVar("T", bound=BaseModel)


def api_endpoint(
    request_model: type[BaseModel] | None = None,
    response_model: type[BaseModel] | None = None,
    validate_query: bool = False,
):
    """
    DRY decorator for API endpoints with automatic validation and serialization.

    Args:
        request_model: Pydantic model for request body validation
        response_model: Pydantic model for response serialization
        validate_query: Whether to validate query parameters
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                # Validate request body
                if request_model and request.method in {"POST", "PUT", "PATCH"}:
                    try:
                        data = request.get_json(force=True)
                        validated_data = request_model(**data)
                        kwargs["data"] = validated_data
                    except ValidationError as e:
                        return handle_validation_error(e)

                # Validate query parameters
                if validate_query and request_model and request.method == "GET":
                    try:
                        query_params = request.args.to_dict()
                        validated_data = request_model(**query_params)
                        kwargs["query"] = validated_data
                    except ValidationError as e:
                        return handle_validation_error(e)

                # Execute endpoint function
                result = func(*args, **kwargs)

                # Serialize response
                if response_model and result is not None:
                    if isinstance(result, dict):
                        response_obj = response_model(**result)
                    elif hasattr(result, "__dict__"):
                        response_obj = response_model.model_validate(result)
                    else:
                        response_obj = result

                    return jsonify(response_obj.model_dump(mode="json"))

                return result

            except NotFoundError as e:
                return handle_not_found_error(e)
            except APIError as e:
                return handle_api_error(e)
            except Exception as e:
                return handle_unexpected_error(e)

        return wrapper

    return decorator


def handle_validation_error(error: ValidationError) -> tuple:
    """Handle Pydantic validation errors."""
    errors = []
    for err in error.errors():
        field = ".".join(str(loc) for loc in err["loc"])
        errors.append({"field": field, "message": err["msg"], "type": err["type"]})

    response = ErrorResponse(
        error=ErrorDetail(code="validation_error", message="Request validation failed", details={"errors": errors})
    )
    return jsonify(response.model_dump()), 400


def handle_not_found_error(error: NotFoundError) -> tuple:
    """Handle not found errors."""
    response = ErrorResponse(error=ErrorDetail(code=error.code, message=error.message))
    return jsonify(response.model_dump()), 404


def handle_api_error(error: APIError) -> tuple:
    """Handle API errors."""
    response = ErrorResponse(error=ErrorDetail(code=error.code, message=error.message, details=error.details))
    return jsonify(response.model_dump()), error.http_status


def handle_unexpected_error(error: Exception) -> tuple:
    """Handle unexpected errors."""
    # Log the error (in production, use proper logging)
    import traceback

    traceback.print_exc()

    response = ErrorResponse(error=ErrorDetail(code="internal_error", message="An unexpected error occurred"))
    return jsonify(response.model_dump()), 500


def with_timing(metric_name: str):
    """Decorator to measure and log execution time."""

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                # Log metric (in production, send to metrics service)
                print(f"[METRIC] {metric_name}: {duration:.3f}s")

        return wrapper

    return decorator


def cached(ttl_seconds: int = 300):
    """Simple caching decorator for functions."""

    def decorator(func: Callable) -> Callable:
        cache = {}
        cache_times = {}

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from args and kwargs
            cache_key = str(args) + str(sorted(kwargs.items()))

            # Check if cached value exists and is still valid
            if cache_key in cache:
                cached_time = cache_times.get(cache_key, 0)
                if time.time() - cached_time < ttl_seconds:
                    return cache[cache_key]

            # Call function and cache result
            result = func(*args, **kwargs)
            cache[cache_key] = result
            cache_times[cache_key] = time.time()

            return result

        # Add cache management methods
        wrapper.clear_cache = lambda: cache.clear() or cache_times.clear()
        wrapper.cache_info = lambda: {"size": len(cache), "ttl": ttl_seconds}

        return wrapper

    return decorator


def require_auth(permission: str | None = None):
    """Decorator to require authentication and optionally check permissions."""

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # In a real application, implement proper authentication
            # For now, this is a placeholder
            auth_header = request.headers.get("Authorization")
            if not auth_header:
                response = ErrorResponse(error=ErrorDetail(code="unauthorized", message="Authentication required"))
                return jsonify(response.model_dump()), 401

            # Check permission if specified
            if permission:
                # Implement permission check
                pass

            return func(*args, **kwargs)

        return wrapper

    return decorator


def validate_content_type(allowed_types: list[str]):
    """Validate request content type."""

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            content_type = request.content_type
            if not content_type:
                response = ErrorResponse(
                    error=ErrorDetail(code="invalid_content_type", message="Content-Type header is required")
                )
                return jsonify(response.model_dump()), 400

            # Check if content type is allowed
            if not any(ct in content_type for ct in allowed_types):
                response = ErrorResponse(
                    error=ErrorDetail(
                        code="invalid_content_type",
                        message=f"Content-Type must be one of: {allowed_types}",
                        details={"provided": content_type},
                    )
                )
                return jsonify(response.model_dump()), 415

            return func(*args, **kwargs)

        return wrapper

    return decorator
