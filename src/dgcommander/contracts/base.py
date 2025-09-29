"""Base contracts for type-safe API responses."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseContract(BaseModel):
    """Base contract with common configuration."""

    model_config = ConfigDict(
        from_attributes=True,
        validate_assignment=True,
        arbitrary_types_allowed=True,
    )


class TypedResponse(BaseModel, Generic[T]):
    """Generic typed response wrapper."""

    data: T
    meta: dict = Field(default_factory=dict)
    errors: list[dict] = Field(default_factory=list)
    success: bool = True


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""

    items: list[T]
    cursor: str | None = None
    has_more: bool = False
    total_count: int | None = None


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: ErrorDetail
    success: bool = False


class ErrorDetail(BaseModel):
    """Error detail structure."""

    code: str
    message: str
    details: dict | None = None
    field: str | None = None
