import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import {
  Streamboard,
  StreamboardAuthError,
  StreamboardError,
  StreamboardNotFoundError,
  StreamboardPayloadError,
  StreamboardRateLimitError,
} from "../index"

const TOKEN = "sb_d_abcdefgh_ZZZZZZZZZZZZZZZZ"
const STREAMBOARD_ID = "board-9xy"

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

describe("Streamboard constructor", () => {
  test("defaults streamboardId to undefined (board resolved from token)", () => {
    const board = new Streamboard({ token: TOKEN, fetch: vi.fn() })
    expect(board.streamboardId).toBeUndefined()
  })

  test("exposes an explicit streamboardId override", () => {
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: vi.fn(),
    })
    expect(board.streamboardId).toBe(STREAMBOARD_ID)
  })

  test("the override is independent of the token's own id", () => {
    // The token id (`abcdefgh`) and the board id are unrelated — when an
    // id is given the client uses it verbatim, never the token's.
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: "board-9xy",
      fetch: vi.fn(),
    })
    expect(board.streamboardId).toBe("board-9xy")
  })

  test("throws when token is missing", () => {
    expect(() => new Streamboard({ token: "", fetch: vi.fn() })).toThrow(
      /token is required/,
    )
  })

  test("throws when token shape is wrong", () => {
    expect(() => new Streamboard({ token: "garbage", fetch: vi.fn() })).toThrow(
      /Token shape is invalid/,
    )
  })
})

describe("Streamboard — token-scoped default route", () => {
  test("push without a streamboardId POSTs to /api/data/v1/board", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, updatedAt: 1 }))
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })
    await board.push({ a: 1 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://usestreamboard.com/api/data/v1/board")
    expect(init.method).toBe("POST")
    expect(init.headers["Authorization"]).toBe(`Bearer ${TOKEN}`)
  })

  test("push surfaces server version and reconciliation warnings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        version: "1.2.0",
        updatedAt: 99,
        warnings: ["Spec binds 1 path(s) this push did not provide: kpis.mrr"],
      }),
    )
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })
    const result = await board.push({ a: 1 })
    expect(result.version).toBe("1.2.0")
    expect(result.warnings).toEqual([
      "Spec binds 1 path(s) this push did not provide: kpis.mrr",
    ])
  })

  test("push tolerates responses without version/warnings (older servers)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, updatedAt: 1 }))
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })
    const result = await board.push({ a: 1 })
    expect(result.warnings).toBeUndefined()
    expect(result.version).toBeUndefined()
  })

  test("pull without a streamboardId GETs /api/data/v1/board", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        streamboardId: STREAMBOARD_ID,
        version: 1,
        updatedAt: null,
        state: {},
      }),
    )
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })
    await board.pull()
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe("https://usestreamboard.com/api/data/v1/board")
  })

  test("a per-call streamboardId override switches to /streamboards/:id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, updatedAt: 1 }))
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })
    await board.push({}, { streamboardId: "explicit" })
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe(
      "https://usestreamboard.com/api/data/v1/streamboards/explicit",
    )
  })
})

describe("Streamboard.push — success", () => {
  test("POSTs JSON to /api/data/v1/streamboards/<id> with bearer header", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, updatedAt: 1234567890 }))
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
    })

    const result = await board.push({ kpis: { mrr: "$48k" } })

    expect(result).toEqual({ ok: true, updatedAt: 1234567890 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      `https://usestreamboard.com/api/data/v1/streamboards/${STREAMBOARD_ID}`,
    )
    expect(init.method).toBe("POST")
    expect(init.headers["Authorization"]).toBe(`Bearer ${TOKEN}`)
    expect(init.headers["Content-Type"]).toBe("application/json")
    expect(JSON.parse(init.body)).toEqual({
      state: { kpis: { mrr: "$48k" } },
    })
  })

  test("honors the baseUrl override", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, updatedAt: 1 }))
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      baseUrl: "http://localhost:5010/",
      fetch: fetchMock,
    })
    await board.push({})
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe(
      `http://localhost:5010/api/data/v1/streamboards/${STREAMBOARD_ID}`,
    )
  })

  test("PushOptions.streamboardId overrides for a single call", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, updatedAt: 1 }))
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
    })
    await board.push({}, { streamboardId: "other-id" })
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe(
      "https://usestreamboard.com/api/data/v1/streamboards/other-id",
    )
  })
})

describe("Streamboard.push — error mapping", () => {
  test("401 -> StreamboardAuthError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
      }),
    )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.push({})).rejects.toBeInstanceOf(StreamboardAuthError)
  })

  test("404 -> StreamboardNotFoundError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Streamboard not found" }), {
        status: 404,
      }),
    )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.push({})).rejects.toBeInstanceOf(
      StreamboardNotFoundError,
    )
  })

  test("400 -> StreamboardPayloadError with server message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Missing state" }), {
        status: 400,
      }),
    )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.push({})).rejects.toMatchObject({
      name: "StreamboardPayloadError",
      status: 400,
      message: "Missing state",
    })
  })

  test("413 -> StreamboardPayloadError", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "Too big" }), { status: 413 }),
      )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.push({})).rejects.toBeInstanceOf(StreamboardPayloadError)
  })

  test("body over 64KB throws before any HTTP call", async () => {
    const fetchMock = vi.fn()
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
    })
    const huge = { blob: "x".repeat(80_000) }
    await expect(board.push(huge)).rejects.toBeInstanceOf(
      StreamboardPayloadError,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("Streamboard.push — retries", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test("retries on 429 up to `retries` and then throws StreamboardRateLimitError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Retry-After": "0" },
      }),
    )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 2,
    })
    const promise = board.push({}).catch((err) => err)
    await vi.runAllTimersAsync()
    const err = await promise
    expect(err).toBeInstanceOf(StreamboardRateLimitError)
    expect(fetchMock).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
  })

  test("retries succeed when server eventually returns 200", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, updatedAt: 999 }))
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 3,
    })
    const promise = board.push({})
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toEqual({ ok: true, updatedAt: 999 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test("retries: 0 disables backoff entirely", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 500 }))
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.push({})).rejects.toBeInstanceOf(StreamboardError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test("signal is forwarded to fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, updatedAt: 1 }))
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    const ctrl = new AbortController()
    await board.push({}, { signal: ctrl.signal })
    const [, init] = fetchMock.mock.calls[0]
    expect(init.signal).toBe(ctrl.signal)
  })

  test("pre-aborted signal short-circuits before the first fetch", async () => {
    const fetchMock = vi.fn()
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(board.push({}, { signal: ctrl.signal })).rejects.toMatchObject(
      { kind: "aborted" },
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("Streamboard.pull — success", () => {
  test("GETs /api/data/v1/streamboards/<id> with bearer header and parses the envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        streamboardId: STREAMBOARD_ID,
        version: 3,
        updatedAt: 1747235600123,
        state: { kpis: { mrr: { value: "$48k" } } },
      }),
    )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
    })

    const result = await board.pull()

    expect(result.streamboardId).toBe(STREAMBOARD_ID)
    expect(result.version).toBe(3)
    expect(result.updatedAt).toBe(1747235600123)
    expect(result.state).toEqual({ kpis: { mrr: { value: "$48k" } } })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      `https://usestreamboard.com/api/data/v1/streamboards/${STREAMBOARD_ID}`,
    )
    expect(init.method).toBe("GET")
    expect(init.headers["Authorization"]).toBe(`Bearer ${TOKEN}`)
    // No body on GET, no Content-Type either (the request is bodyless).
    expect(init.body).toBeUndefined()
    expect(init.headers["Content-Type"]).toBeUndefined()
  })

  test("accepts an empty state envelope (no push has happened yet)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        streamboardId: STREAMBOARD_ID,
        version: 1,
        updatedAt: null,
        state: {},
      }),
    )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
    })
    const result = await board.pull()
    expect(result.state).toEqual({})
    expect(result.updatedAt).toBeNull()
  })

  test("PullOptions.streamboardId overrides for a single call", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        streamboardId: "other-id",
        version: 1,
        updatedAt: null,
        state: {},
      }),
    )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
    })
    await board.pull({ streamboardId: "other-id" })
    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe(
      "https://usestreamboard.com/api/data/v1/streamboards/other-id",
    )
  })
})

describe("Streamboard.pull — error mapping", () => {
  test("401 -> StreamboardAuthError", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: "Invalid token" }, { status: 401 }),
      )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.pull()).rejects.toBeInstanceOf(StreamboardAuthError)
  })

  test("404 -> StreamboardNotFoundError", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: "Streamboard not found" }, { status: 404 }),
      )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.pull()).rejects.toBeInstanceOf(StreamboardNotFoundError)
  })

  test("429 -> StreamboardRateLimitError after retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: "Rate limit exceeded" }, { status: 429 }),
      )
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.pull()).rejects.toBeInstanceOf(StreamboardRateLimitError)
  })

  test("malformed response body -> StreamboardError(kind=protocol)", async () => {
    // Server returns 200 OK but with the wrong shape — SDK should
    // surface that instead of returning garbage.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ totally: "wrong" }))
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.pull()).rejects.toMatchObject({ kind: "protocol" })
  })

  test("pre-aborted signal short-circuits before the first fetch", async () => {
    const fetchMock = vi.fn()
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(board.pull({ signal: ctrl.signal })).rejects.toMatchObject({
      kind: "aborted",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// Also confirm push tests still see only "PushOptions" / "PushResult"
// shapes — the underlying refactor of requestWithRetries from a
// PushResult-typed signature to `unknown` could in principle silently
// regress callers; the success-shape guard in push() catches that.
describe("Streamboard.push — protocol guard after refactor", () => {
  test("push rejects when server returns a body without ok: true", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ wat: "no ok" }))
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: STREAMBOARD_ID,
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.push({})).rejects.toMatchObject({ kind: "protocol" })
  })
})
