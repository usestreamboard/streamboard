/**
 * @streamboard/sdk — TypeScript client for pushing live data to a
 * streamboard from crons, agents, Workers, or any process that wants
 * to keep a hosted streamboard's KPI tiles, charts, and tables fresh
 * without paying the cost of re-asking an LLM.
 *
 * Authentication is per-streamboard bearer (`sb_d_<id>_<secret>`),
 * minted in the web app at `/app/s/:id/tokens`. Hand the token to
 * the worker in an env var; the SDK extracts the streamboardId from
 * it so the caller doesn't have to pass the same id twice.
 *
 * Zero dependencies. Uses the platform's `fetch` (works on Node 18+,
 * Bun, Deno, Cloudflare Workers). The instance keeps no state
 * between calls; one `Streamboard` per logical job is the intended
 * usage.
 *
 * @example
 * ```ts
 * import { Streamboard } from "@streamboard/sdk"
 *
 * const board = new Streamboard({ token: process.env.STREAMBOARD_TOKEN! })
 * await board.push({
 *   kpis: { mrr: { value: "$48.2k", delta: "+4%", trend: "up" } },
 * })
 * ```
 */

import { parseToken } from "./parse-token"

export type { ParsedToken } from "./parse-token"
export { parseToken, TOKEN_PREFIX } from "./parse-token"

/** Default base URL for the hosted streamboard API. */
const DEFAULT_BASE_URL = "https://usestreamboard.com"

/** Maximum state-envelope body size accepted by the server (64 KB). */
const MAX_STATE_BYTES = 64 * 1024

/** Cap on automatic retries for transient failures (429, 5xx). */
const DEFAULT_MAX_RETRIES = 3

/** Initial backoff for retry #1 (jittered, doubled per attempt). */
const RETRY_BASE_MS = 250

// ─── Errors ───────────────────────────────────────────────────────

/**
 * Base error class for SDK failures. Inspect `kind` (or use
 * `instanceof`) to branch on the failure mode without parsing the
 * message string.
 */
export class StreamboardError extends Error {
  readonly kind: string
  readonly status: number | null

  constructor(kind: string, message: string, status: number | null = null) {
    super(message)
    this.name = "StreamboardError"
    this.kind = kind
    this.status = status
  }
}

/** Token rejected — 401. Re-mint at /app/s/:id/tokens. */
export class StreamboardAuthError extends StreamboardError {
  constructor(message = "Token invalid or revoked") {
    super("auth", message, 401)
    this.name = "StreamboardAuthError"
  }
}

/** Streamboard deleted or never existed — 404. */
export class StreamboardNotFoundError extends StreamboardError {
  constructor(message = "Streamboard not found") {
    super("not_found", message, 404)
    this.name = "StreamboardNotFoundError"
  }
}

/** Payload rejected — 400 or 413. Check size + shape. */
export class StreamboardPayloadError extends StreamboardError {
  constructor(status: 400 | 413, message: string) {
    super("payload", message, status)
    this.name = "StreamboardPayloadError"
  }
}

/**
 * Server returned 429 too many times in a row. `retryAfterMs` is
 * `null` when the server didn't surface a hint; otherwise it's the
 * minimum suggested wait before retrying.
 */
export class StreamboardRateLimitError extends StreamboardError {
  readonly retryAfterMs: number | null
  constructor(retryAfterMs: number | null) {
    super("rate_limit", "Rate limit exceeded after retries", 429)
    this.name = "StreamboardRateLimitError"
    this.retryAfterMs = retryAfterMs
  }
}

// ─── Public types ─────────────────────────────────────────────────

/**
 * Optional generic over the state envelope shape. Defaults to a
 * permissive `Record<string, unknown>` so the SDK is usable
 * untyped. Phase 2 codegen wires a per-board interface here for
 * compile-time checks.
 */
export type StreamboardState = Record<string, unknown>

export interface StreamboardOptions {
  /** Bearer token, format `sb_d_<id>_<secret>`. Required. */
  token: string
  /**
   * Override the API base URL. Defaults to
   * `https://usestreamboard.com`. Set for self-hosting or testing
   * against a local `wrangler dev` server.
   */
  baseUrl?: string
  /**
   * Override the streamboardId derived from the token. Use this
   * when running a fleet of tokens against multiple boards through
   * one SDK instance (token-broker pattern). When omitted, the
   * SDK extracts the id from the `sb_d_<id>_…` token prefix.
   */
  streamboardId?: string
  /**
   * Inject a custom `fetch`. Useful for tests, telemetry hooks,
   * or constrained runtimes that ship a non-global fetch.
   */
  fetch?: typeof fetch
  /**
   * Maximum automatic retries on 429 / 5xx. Defaults to 3. Set to
   * 0 to disable retries entirely (caller handles backoff).
   */
  retries?: number
}

export interface PushResult {
  ok: true
  /** Server-side wall-clock at write, milliseconds since epoch. */
  updatedAt: number
}

export interface PushOptions {
  /**
   * Abort the in-flight HTTP request. Passed through to `fetch`.
   * Retries respect the abort signal too — once aborted, the SDK
   * does not schedule further attempts.
   */
  signal?: AbortSignal
  /**
   * Override the target streamboardId for this single call. Useful
   * with token-broker patterns where one process pushes to many
   * boards under different tokens.
   */
  streamboardId?: string
}

// ─── Client ───────────────────────────────────────────────────────

/**
 * One-streamboard push client. Construct once per cron / agent and
 * reuse it — the instance is stateless and thread-safe (Node + Bun)
 * across concurrent calls. Each `.push()` is a single HTTP POST.
 */
export class Streamboard<TState extends StreamboardState = StreamboardState> {
  /** Streamboard id parsed from the token (or overridden). */
  readonly streamboardId: string

  private readonly token: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly retries: number

  constructor(options: StreamboardOptions) {
    if (!options?.token) {
      throw new StreamboardError("config", "options.token is required")
    }
    const parsed = parseToken(options.token)
    if (!parsed) {
      throw new StreamboardError(
        "config",
        "Token shape is invalid. Expected `sb_d_<id>_<secret>`.",
      )
    }

    this.token = options.token
    this.streamboardId = options.streamboardId ?? parsed.id
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? DEFAULT_BASE_URL)
    this.fetchImpl =
      options.fetch ?? (typeof fetch !== "undefined" ? fetch : undefined!)
    this.retries = options.retries ?? DEFAULT_MAX_RETRIES

    if (!this.fetchImpl) {
      throw new StreamboardError(
        "config",
        "No global `fetch` available. Pass `options.fetch` (Node 18+ has it, older Nodes need a polyfill).",
      )
    }
  }

  /**
   * Push a state envelope to the streamboard. The viewer hydrates
   * any `{ $bind: "path" }` refs in the spec from the keys of this
   * object on the next render (cached at the edge for ~60s).
   *
   * Last-write-wins: subsequent pushes overwrite the entire
   * `streamboardState` row. Pass the FULL envelope the spec expects;
   * partial pushes drop any unmentioned slots back to default.
   */
  async push(state: TState, options: PushOptions = {}): Promise<PushResult> {
    const id = options.streamboardId ?? this.streamboardId
    const url = `${this.baseUrl}/api/data/v1/streamboards/${encodeURIComponent(id)}`
    const body = JSON.stringify({ state })

    // Cheap client-side guard against the server's 64KB cap. We
    // compute byte length so multi-byte glyphs in payloads don't
    // sneak past a naive `.length` check.
    const bodyBytes = byteLength(body)
    if (bodyBytes > MAX_STATE_BYTES) {
      throw new StreamboardPayloadError(
        413,
        `State envelope is ${bodyBytes} bytes; the server caps at ${MAX_STATE_BYTES}.`,
      )
    }

    return this.requestWithRetries(url, body, options.signal)
  }

  private async requestWithRetries(
    url: string,
    body: string,
    signal: AbortSignal | undefined,
  ): Promise<PushResult> {
    let lastRetryAfterMs: number | null = null
    let attempt = 0

    while (true) {
      attempt++
      if (signal?.aborted) {
        throw new StreamboardError("aborted", "Push aborted by caller")
      }

      let res: Response
      try {
        res = await this.fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body,
          signal,
        })
      } catch (err) {
        // Network error — retry like a 5xx if budget remains.
        if (attempt > this.retries) {
          throw new StreamboardError(
            "network",
            err instanceof Error ? err.message : "Network failure",
          )
        }
        await sleep(backoffMs(attempt, null), signal)
        continue
      }

      // Success
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as PushResult | null
        if (!data || data.ok !== true) {
          throw new StreamboardError(
            "protocol",
            "Unexpected response body shape",
            res.status,
          )
        }
        return data
      }

      // Hard errors — no retry.
      if (res.status === 401) throw new StreamboardAuthError()
      if (res.status === 404) throw new StreamboardNotFoundError()
      if (res.status === 400 || res.status === 413) {
        const message = await safeErrorMessage(res)
        throw new StreamboardPayloadError(res.status, message)
      }

      // Retry-eligible: 429 or 5xx.
      if (res.status === 429 || res.status >= 500) {
        if (attempt > this.retries) {
          if (res.status === 429) {
            throw new StreamboardRateLimitError(lastRetryAfterMs)
          }
          throw new StreamboardError(
            "server",
            await safeErrorMessage(res),
            res.status,
          )
        }
        lastRetryAfterMs = parseRetryAfter(res.headers.get("Retry-After"))
        await sleep(backoffMs(attempt, lastRetryAfterMs), signal)
        continue
      }

      // Any other status — surface as-is.
      throw new StreamboardError(
        "server",
        await safeErrorMessage(res),
        res.status,
      )
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

/**
 * Byte length of a UTF-8 string. Works in every runtime: Node, Bun,
 * Deno, Workers. `Blob` is universally available in modern JS even
 * outside the DOM.
 */
function byteLength(s: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(s).byteLength
  }
  // Fallback for ancient runtimes: rough but conservative
  // overestimate (treats every char as 4 bytes worst-case).
  return s.length * 4
}

async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string } | null
    if (data?.error) return data.error
  } catch {
    // body not JSON — fall through
  }
  return `HTTP ${res.status} ${res.statusText}`
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  // HTTP-date format — convert to delta ms.
  const date = Date.parse(header)
  if (Number.isFinite(date)) return Math.max(0, date - Date.now())
  return null
}

function backoffMs(attempt: number, retryAfterMs: number | null): number {
  if (retryAfterMs != null) return retryAfterMs
  // Exponential with full jitter: each retry sleeps for a random
  // delay in [0, base * 2^(attempt-1)]. Keeps thundering herds at
  // bay when a fleet of workers retries the same 429.
  const max = RETRY_BASE_MS * 2 ** (attempt - 1)
  return Math.floor(Math.random() * max)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new StreamboardError("aborted", "Push aborted by caller"))
      return
    }
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(new StreamboardError("aborted", "Push aborted by caller"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}
