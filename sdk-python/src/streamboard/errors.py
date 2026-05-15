"""Exception hierarchy — mirrors @streamboard/sdk (TypeScript).

Branch on `kind` (or `isinstance`) instead of parsing messages.
"""

from __future__ import annotations


class StreamboardError(Exception):
    """Base SDK failure."""

    def __init__(self, kind: str, message: str, status: int | None = None) -> None:
        super().__init__(message)
        self.kind = kind
        self.status = status


class StreamboardAuthError(StreamboardError):
    """Token rejected — 401. Re-mint at /app/s/:id/tokens."""

    def __init__(self, message: str = "Token invalid or revoked") -> None:
        super().__init__("auth", message, 401)


class StreamboardNotFoundError(StreamboardError):
    """Streamboard deleted or never existed — 404."""

    def __init__(self, message: str = "Streamboard not found") -> None:
        super().__init__("not_found", message, 404)


class StreamboardPayloadError(StreamboardError):
    """Payload rejected — 400 or 413. Check size + shape."""

    def __init__(self, status: int, message: str) -> None:
        super().__init__("payload", message, status)


class StreamboardRateLimitError(StreamboardError):
    """Server returned 429 past the retry budget.

    `retry_after_ms` is None when the server gave no hint.
    """

    def __init__(self, retry_after_ms: int | None) -> None:
        super().__init__("rate_limit", "Rate limit exceeded after retries", 429)
        self.retry_after_ms = retry_after_ms
