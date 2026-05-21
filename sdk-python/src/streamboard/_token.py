"""Data-token format primitives.

Tokens are `sb_d_<id>_<secret>`, minted at /app/s/:id/tokens. The `<id>`
segment lets the SDK derive the target streamboard without the caller
passing it twice. Mirrors parse-token.ts in @streamboard/sdk.
"""

from __future__ import annotations

from typing import NamedTuple

TOKEN_PREFIX = "sb_d"


class ParsedToken(NamedTuple):
    id: str
    secret: str


def parse_token(raw: str | None) -> ParsedToken | None:
    """`{id, secret}` from a bearer string, or None if shape is wrong.

    Four `_`-split segments: `sb`, `d`, `<id>`, `<secret>`. The base32 /
    base64url alphabets contain no underscore, so split-on-`_` is safe.
    """
    if not raw:
        return None
    parts = raw.split("_")
    if len(parts) != 4:
        return None
    if parts[0] != "sb" or parts[1] != "d":
        return None
    sid, secret = parts[2], parts[3]
    if not sid or not secret:
        return None
    if len(sid) < 4 or len(secret) < 16:
        return None
    return ParsedToken(id=sid, secret=secret)
