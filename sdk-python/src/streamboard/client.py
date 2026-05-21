"""Synchronous streamboard client — push / pull / schema.

Mirrors @streamboard/sdk (TypeScript): per-streamboard bearer auth
(`sb_d_<id>_<secret>`), last-write-wins state envelope, jittered
exponential backoff on 429 / 5xx / network errors honouring
`Retry-After`. One `Streamboard` per logical job; the instance is
stateless across calls and safe to reuse.

    from streamboard import Streamboard

    board = Streamboard(token=os.environ["STREAMBOARD_TOKEN"])
    board.push({"kpis": {"mrr": {"value": "$48.2k", "delta": "+4%"}}})
"""

from __future__ import annotations

import json
import random
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx

from ._token import parse_token
from .errors import (
    StreamboardAuthError,
    StreamboardError,
    StreamboardNotFoundError,
    StreamboardPayloadError,
    StreamboardRateLimitError,
)

DEFAULT_BASE_URL = "https://usestreamboard.com"
MAX_STATE_BYTES = 64 * 1024
DEFAULT_MAX_RETRIES = 3
RETRY_BASE_MS = 250

State = dict[str, Any]


@dataclass(frozen=True)
class PushResult:
    ok: bool
    """Server wall-clock at write, ms since epoch."""
    updated_at: int


@dataclass(frozen=True)
class PullResult:
    streamboard_id: str
    """Latest spec version the state correlates with (semver string)."""
    version: str
    """Server wall-clock at last write, ms since epoch. None if never pushed."""
    updated_at: int | None
    state: State


def _trim_slash(url: str) -> str:
    return url[:-1] if url.endswith("/") else url


def _parse_retry_after(header: str | None) -> int | None:
    if not header:
        return None
    try:
        secs = float(header)
        if secs >= 0:
            return int(secs * 1000)
    except ValueError:
        pass
    try:
        from email.utils import parsedate_to_datetime

        when = parsedate_to_datetime(header)
        return max(0, int(when.timestamp() * 1000 - time.time() * 1000))
    except (TypeError, ValueError):
        return None


def _backoff_ms(attempt: int, retry_after_ms: int | None) -> int:
    if retry_after_ms is not None:
        return retry_after_ms
    # Full jitter: random in [0, base * 2^(attempt-1)].
    return random.randint(0, RETRY_BASE_MS * 2 ** (attempt - 1))


class Streamboard:
    """One-streamboard data client."""

    def __init__(
        self,
        *,
        token: str,
        base_url: str = DEFAULT_BASE_URL,
        streamboard_id: str | None = None,
        retries: int = DEFAULT_MAX_RETRIES,
        client: httpx.Client | None = None,
    ) -> None:
        if not token:
            raise StreamboardError("config", "token is required")
        parsed = parse_token(token)
        if parsed is None:
            raise StreamboardError(
                "config",
                "Token shape is invalid. Expected `sb_d_<id>_<secret>`.",
            )
        self._token = token
        self.streamboard_id = streamboard_id or parsed.id
        self._base_url = _trim_slash(base_url)
        self._retries = retries
        self._client = client or httpx.Client(timeout=30.0)
        self._owns_client = client is None

    # Context-manager sugar so `with Streamboard(...) as b:` closes the
    # underlying httpx client when we created it.
    def __enter__(self) -> Streamboard:
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def push(self, state: State, *, streamboard_id: str | None = None) -> PushResult:
        """Overwrite the streamboard's state envelope (last-write-wins).

        Pass the FULL envelope the spec expects; unmentioned `$bind`
        slots fall back to their defaults.
        """
        sid = streamboard_id or self.streamboard_id
        body = json.dumps({"state": state}, separators=(",", ":"))
        nbytes = len(body.encode("utf-8"))
        if nbytes > MAX_STATE_BYTES:
            raise StreamboardPayloadError(
                413,
                f"State envelope is {nbytes} bytes; "
                f"the server caps at {MAX_STATE_BYTES}.",
            )
        raw = self._request("POST", self._url(sid), body=body)
        if not isinstance(raw, dict) or raw.get("ok") is not True:
            raise StreamboardError("protocol", "Unexpected response body shape")
        return PushResult(ok=True, updated_at=int(raw["updatedAt"]))

    def pull(self, *, streamboard_id: str | None = None) -> PullResult:
        """Read the current state envelope.

        `state` is always a dict (server returns `{}` when nothing has
        been pushed); `updated_at` is None in that case.
        """
        sid = streamboard_id or self.streamboard_id
        raw = self._request("GET", self._url(sid))
        if (
            not isinstance(raw, dict)
            or not isinstance(raw.get("streamboardId"), str)
            or not isinstance(raw.get("state"), dict)
        ):
            raise StreamboardError("protocol", "Unexpected pull() response body shape")
        return PullResult(
            streamboard_id=raw["streamboardId"],
            version=str(raw.get("version")),
            updated_at=(
                int(raw["updatedAt"]) if raw.get("updatedAt") is not None else None
            ),
            state=raw["state"],
        )

    def schema(self, *, streamboard_id: str | None = None) -> dict[str, Any]:
        """The state-envelope type contract for codegen / validation.

        Returns the raw `{streamboardId, version, fields, jsonSchema}`
        document the server derives from the latest spec's `$bind` refs.
        """
        sid = streamboard_id or self.streamboard_id
        raw = self._request("GET", f"{self._url(sid)}/schema")
        if not isinstance(raw, dict) or "jsonSchema" not in raw:
            raise StreamboardError(
                "protocol", "Unexpected schema() response body shape"
            )
        return raw

    def _url(self, sid: str) -> str:
        return f"{self._base_url}/api/data/v1/streamboards/{quote(sid, safe='')}"

    def _request(self, method: str, url: str, *, body: str | None = None) -> Any:
        last_retry_after: int | None = None
        attempt = 0
        while True:
            attempt += 1
            headers = {"Authorization": f"Bearer {self._token}"}
            if method == "POST":
                headers["Content-Type"] = "application/json"
            try:
                res = self._client.request(method, url, headers=headers, content=body)
            except httpx.HTTPError as exc:
                if attempt > self._retries:
                    raise StreamboardError("network", str(exc)) from exc
                time.sleep(_backoff_ms(attempt, None) / 1000)
                continue

            if res.is_success:
                try:
                    return res.json()
                except ValueError:
                    return None

            status = res.status_code
            if status == 401:
                raise StreamboardAuthError()
            if status == 404:
                raise StreamboardNotFoundError()
            if status in (400, 413):
                raise StreamboardPayloadError(status, _err_message(res))
            if status == 429 or status >= 500:
                if attempt > self._retries:
                    if status == 429:
                        raise StreamboardRateLimitError(last_retry_after)
                    raise StreamboardError("server", _err_message(res), status)
                last_retry_after = _parse_retry_after(res.headers.get("Retry-After"))
                time.sleep(_backoff_ms(attempt, last_retry_after) / 1000)
                continue
            raise StreamboardError("server", _err_message(res), status)


def _err_message(res: httpx.Response) -> str:
    try:
        data = res.json()
        if isinstance(data, dict) and isinstance(data.get("error"), str):
            return data["error"]
    except ValueError:
        pass
    return f"HTTP {res.status_code} {res.reason_phrase}"
