"""Utility helpers for JSON responses."""
from __future__ import annotations

from typing import Any

from flask import Response, jsonify


def json_response(payload: Any, status: int = 200) -> Response:
    response = jsonify(payload)
    response.status_code = status
    return response

