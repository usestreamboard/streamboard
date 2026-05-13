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
const STREAMBOARD_ID = "abcdefgh"

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

describe("Streamboard constructor", () => {
  test("parses the token and exposes streamboardId", () => {
    const board = new Streamboard({ token: TOKEN, fetch: vi.fn() })
    expect(board.streamboardId).toBe(STREAMBOARD_ID)
  })

  test("`streamboardId` override wins over the token's parsed id", () => {
    const board = new Streamboard({
      token: TOKEN,
      streamboardId: "custom-id",
      fetch: vi.fn(),
    })
    expect(board.streamboardId).toBe("custom-id")
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

describe("Streamboard.push — success", () => {
  test("POSTs JSON to /api/data/v1/streamboards/<id> with bearer header", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, updatedAt: 1234567890 }))
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })

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
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })
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
      fetch: fetchMock,
      retries: 0,
    })
    await expect(board.push({})).rejects.toBeInstanceOf(StreamboardPayloadError)
  })

  test("body over 64KB throws before any HTTP call", async () => {
    const fetchMock = vi.fn()
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })
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
