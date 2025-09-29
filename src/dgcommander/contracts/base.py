"""Base contracts for type-safe API responses."""
from __future__ import annotations

from datetime import datetime
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field


T = TypeVar('T')


class BaseContract(BaseModel):
    """Base contract with common configuration."""
    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda v: v.isoformat().replace("+00:00", "Z")
        },
        validate_assignment=True,
        arbitrary_types_allowed=True
    )


class TypedResponse(BaseModel, Generic[T]):
    """Generic typed response wrapper."""
    data: T
    meta: dict = Field(default_factory=dict)
    errors: List[dict] = Field(default_factory=list)
    success: bool = True


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""
    items: List[T]
    cursor: Optional[str] = None
    has_more: bool = False
    total_count: Optional[int] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: ErrorDetail
    success: bool = False


class ErrorDetail(BaseModel):
    """Error detail structure."""
    code: str
    message: str
    details: Optional[dict] = None
    field: Optional[str] = None