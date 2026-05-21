"""streamboard — Python client for pushing live data to a streamboard.

from streamboard import Streamboard

board = Streamboard(token=os.environ["STREAMBOARD_TOKEN"])
board.push({"kpis": {"mrr": {"value": "$48.2k"}}})
print(board.pull().state)
"""

from __future__ import annotations

from ._token import ParsedToken, parse_token
from .client import PullResult, PushResult, Streamboard
from .errors import (
    StreamboardAuthError,
    StreamboardError,
    StreamboardNotFoundError,
    StreamboardPayloadError,
    StreamboardRateLimitError,
)

__all__ = [
    "ParsedToken",
    "parse_token",
    "Streamboard",
    "PushResult",
    "PullResult",
    "StreamboardError",
    "StreamboardAuthError",
    "StreamboardNotFoundError",
    "StreamboardPayloadError",
    "StreamboardRateLimitError",
]

__version__ = "0.1.0"
