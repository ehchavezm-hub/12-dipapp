"""RFC 7807 Problem Details schema."""
from pydantic import BaseModel


class ProblemDetail(BaseModel):
    """RFC 7807 Problem Details for HTTP APIs."""

    type: str
    title: str
    status: int
    detail: str
