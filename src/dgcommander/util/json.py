"""Utility helpers for JSON responses."""

from __future__ import annotations

import json
from typing import Any

from flask import Response, make_response


def json_response(payload: Any, status: int = 200) -> Response:
    # Use explicit JSON serialization with proper headers
    json_data = json.dumps(payload, ensure_ascii=False)
    response = make_response(json_data, status)
    response.headers["Content-Type"] = "application/json; charset=utf-8"
    response.headers["Content-Length"] = str(len(json_data.encode("utf-8")))
    return response
