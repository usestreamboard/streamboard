from __future__ import annotations

import json

import httpx
import pytest

from streamboard import (
    Streamboard,
    StreamboardAuthError,
    StreamboardNotFoundError,
    StreamboardPayloadError,
    StreamboardRateLimitError,
    parse_token,
)

TOKEN = "sb_d_abcd_secretsecretsecret16"


def _board(handler) -> Streamboard:
    transport = httpx.MockTransport(handler)
    return Streamboard(
        token=TOKEN,
        client=httpx.Client(transport=transport),
        retries=2,
    )


def test_parse_token() -> None:
    p = parse_token(TOKEN)
    assert p is not None
    assert p.id == "abcd"
    assert parse_token("nope") is None
    assert parse_token("sb_d_abcd_short") is None  # secret < 16


def test_streamboard_id_defaults_to_none() -> None:
    # No id passed → resolved server-side from the token (token-scoped route).
    b = _board(lambda r: httpx.Response(200, json={"ok": True}))
    assert b.streamboard_id is None


def test_explicit_streamboard_id_targets_streamboards_route() -> None:
    seen: dict = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["url"] = str(req.url)
        return httpx.Response(200, json={"ok": True, "updatedAt": 1})

    transport = httpx.MockTransport(handler)
    board = Streamboard(
        token=TOKEN,
        streamboard_id="board-xyz",
        client=httpx.Client(transport=transport),
    )
    board.push({})
    assert seen["url"].endswith("/api/data/v1/streamboards/board-xyz")


def test_push_success() -> None:
    seen: dict = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["url"] = str(req.url)
        seen["auth"] = req.headers["authorization"]
        seen["body"] = json.loads(req.content)
        return httpx.Response(200, json={"ok": True, "updatedAt": 1700000000000})

    res = _board(handler).push({"kpis": {"mrr": "x"}})
    assert res.ok is True
    assert res.updated_at == 1700000000000
    assert seen["url"].endswith("/api/data/v1/board")
    assert seen["auth"] == f"Bearer {TOKEN}"
    assert seen["body"] == {"state": {"kpis": {"mrr": "x"}}}


def test_push_oversize_rejected_client_side() -> None:
    big = {"k": "x" * (64 * 1024)}
    with pytest.raises(StreamboardPayloadError) as ei:
        _board(lambda r: httpx.Response(200, json={"ok": True})).push(big)
    assert ei.value.status == 413


def test_pull_shape() -> None:
    def handler(_r: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "streamboardId": "abcd",
                "version": "2.1.0",
                "updatedAt": 123,
                "state": {"a": 1},
            },
        )

    res = _board(handler).pull()
    assert res.streamboard_id == "abcd"
    assert res.version == "2.1.0"  # semver string, not int
    assert res.updated_at == 123
    assert res.state == {"a": 1}


def test_pull_never_pushed() -> None:
    res = _board(
        lambda r: httpx.Response(
            200,
            json={
                "streamboardId": "abcd",
                "version": "1.0.0",
                "updatedAt": None,
                "state": {},
            },
        )
    ).pull()
    assert res.updated_at is None
    assert res.state == {}


def test_auth_error() -> None:
    with pytest.raises(StreamboardAuthError):
        _board(lambda r: httpx.Response(401, json={"error": "bad"})).pull()


def test_not_found() -> None:
    with pytest.raises(StreamboardNotFoundError):
        _board(lambda r: httpx.Response(404, json={"error": "gone"})).pull()


def test_retry_then_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("streamboard.client.time.sleep", lambda _s: None)
    calls = {"n": 0}

    def handler(_r: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] < 2:
            return httpx.Response(503, json={"error": "down"})
        return httpx.Response(200, json={"ok": True, "updatedAt": 9})

    res = _board(handler).push({})
    assert res.updated_at == 9
    assert calls["n"] == 2


def test_rate_limit_exhausts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("streamboard.client.time.sleep", lambda _s: None)
    with pytest.raises(StreamboardRateLimitError):
        _board(
            lambda r: httpx.Response(
                429, headers={"Retry-After": "1"}, json={"error": "slow"}
            )
        ).push({})
