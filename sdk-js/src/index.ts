/**
 * @streamboard/sdk — TypeScript client for pushing live data to a
 * streamboard from crons, agents, Workers, or any process that wants
 * to keep a hosted streamboard's KPI tiles, charts, and tables fresh
 * without paying the cost of re-asking an LLM.
 *
 * Authentication is per-streamboard bearer (`sb_d_<id>_<secret>`),
 * minted in the web app at `/app/s/:id/tokens`. Hand the token to the
 * worker in an env var — the server resolves which board the token
 * targets from the token itself, so the caller passes no board id.
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
export { buildStateInterfaceBody, generate } from "./codegen"

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
   * Optional board id — the `<id>` segment in `/s/<id>`.
   *
   * Usually omit this: the server resolves the board from the token
   * itself (each `sb_d_*` token belongs to exactly one board), so the
   * default surface needs nothing but the bearer. Set it only to
   * address a board explicitly — e.g. a token-broker that swaps one id
   * per call, or to pin a request to a known id. When set, the SDK
   * targets `/streamboards/:id`; when omitted, the token-scoped
   * `/board` route.
   *
   * The token's `<id>` segment is the *token's* own id, not the board
   * id — they're independent, so this can't be parsed from the token.
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
  /** Latest spec version the push attached to (semver string). */
  version?: string
  /** Server-side wall-clock at write, milliseconds since epoch. */
  updatedAt: number
  /**
   * Advisory reconciliation warnings from the server: bind paths the
   * spec consumes that this push did not provide, and envelope keys no
   * bind path reads (typo / schema drift). The push succeeded — these
   * exist so workers catch drift at the source instead of users seeing
   * silently-default slots. Absent when the envelope fully covers the
   * spec.
   */
  warnings?: string[]
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

/**
 * Result of a `Streamboard.pull()`. The `state` field is always an
 * object (the server returns `{}` when no push has ever happened)
 * so callers can dereference top-level keys without null checks.
 * `updatedAt` is null in that no-state-yet case.
 */
export interface PullResult<
  TState extends StreamboardState = StreamboardState,
> {
  streamboardId: string
  /** Latest spec version the state correlates with. */
  version: number
  /** Server-side wall-clock at last write, ms since epoch. Null if never pushed. */
  updatedAt: number | null
  state: TState
}

export interface PullOptions {
  /** Same as `PushOptions.signal`. */
  signal?: AbortSignal
  /** Same as `PushOptions.streamboardId`. */
  streamboardId?: string
}

/**
 * One bindable slot in a streamboard's state envelope, as returned by
 * `GET /api/data/v1/streamboards/<id>/schema`. The server derives this
 * from the latest spec's `{ $bind: "path" }` refs; `tsType` is the
 * concrete TypeScript annotation `streamboard-codegen` emits.
 */
export interface SchemaField {
  /** Dotted path inside the state envelope, e.g. `"kpis.mrr.value"`. */
  path: string
  /** Component the bind sits on (e.g. `"KPI"`). */
  componentType: string
  /** Prop name on that component (e.g. `"value"`). */
  propName: string
  /** TypeScript type string for codegen. */
  tsType: string
  /** JSON Schema fragment for the value at this path. */
  jsonSchema: unknown
}

/**
 * Result of `Streamboard.schema()` — the state-envelope type contract
 * the server derives from the latest spec's `$bind` refs. Consumed by
 * `streamboard-codegen` to emit a typed `StreamboardState` interface.
 */
export interface SchemaResult {
  streamboardId: string
  /** Spec version the schema was derived from (semver string). */
  version: string
  /** Every bindable slot, with its codegen `tsType` + JSON Schema. */
  fields: SchemaField[]
  /** Folded JSON Schema document (draft 2020-12) for the whole envelope. */
  jsonSchema?: unknown
}

export interface SchemaOptions {
  /** Same as `PushOptions.signal`. */
  signal?: AbortSignal
  /** Same as `PushOptions.streamboardId`. */
  streamboardId?: string
}

// ─── Client ───────────────────────────────────────────────────────

/**
 * One-streamboard push client. Construct once per cron / agent and
 * reuse it — the instance is stateless and thread-safe (Node + Bun)
 * across concurrent calls. Each `.push()` is a single HTTP POST.
 */
export class Streamboard<TState extends StreamboardState = StreamboardState> {
  /**
   * Board id override the instance was constructed with, or `undefined`
   * when the board is resolved server-side from the token. `pull()` and
   * `schema()` responses also carry the resolved id.
   */
  readonly streamboardId: string | undefined

  private readonly token: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly retries: number

  constructor(options: StreamboardOptions) {
    if (!options?.token) {
      throw new StreamboardError("config", "options.token is required")
    }
    // Validate token shape (rejects garbage early). We never read an id
    // out of the token: its `<id>` segment is the token's own lookup
    // key, not the board id. The server resolves the board from the
    // token row instead.
    if (!parseToken(options.token)) {
      throw new StreamboardError(
        "config",
        "Token shape is invalid. Expected `sb_d_<id>_<secret>`.",
      )
    }

    this.token = options.token
    // Optional: when omitted the server resolves the board from the token
    // (token-scoped `/board` route). When set, the SDK addresses
    // `/streamboards/:id` explicitly.
    this.streamboardId = options.streamboardId
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
    const url = this.boardUrl(id)
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

    const raw = await this.requestWithRetries(
      url,
      { method: "POST", body },
      options.signal,
    )
    if (!raw || (raw as PushResult).ok !== true) {
      throw new StreamboardError("protocol", "Unexpected response body shape")
    }
    return raw as PushResult
  }

  /**
   * Read the current state envelope from the server. Returns the same
   * shape the renderer hydrates against `{ $bind: "path" }` slots —
   * use it from a sibling worker that wants to subscribe to "latest
   * state" without owning the push path, or from the same worker
   * that pushes when you need to diff against the previous value.
   *
   * The server returns `state: {}` when no push has ever happened;
   * the SDK keeps that shape so callers can dereference top-level
   * keys without null checks.
   */
  async pull(options: PullOptions = {}): Promise<PullResult<TState>> {
    const id = options.streamboardId ?? this.streamboardId
    const url = this.boardUrl(id)
    const raw = await this.requestWithRetries(
      url,
      { method: "GET" },
      options.signal,
    )
    const data = raw as Partial<PullResult<TState>> | null
    if (
      !data ||
      typeof data.streamboardId !== "string" ||
      typeof data.version !== "number" ||
      (data.updatedAt !== null && typeof data.updatedAt !== "number") ||
      !data.state ||
      typeof data.state !== "object" ||
      Array.isArray(data.state)
    ) {
      // `Array.isArray` guard is belt-and-braces: server upserts
      // arbitrary JSON into `streamboardState.stateJson`, and the
      // store could in theory hold a top-level array (it shouldn't,
      // but the type system can't prevent it). The renderer treats
      // arrays differently from objects, so reject loudly instead of
      // passing a structurally-wrong envelope to typed callers.
      throw new StreamboardError(
        "protocol",
        "Unexpected pull() response body shape",
      )
    }
    return data as PullResult<TState>
  }

  /**
   * Fetch the state-envelope type contract for this streamboard — the
   * `{ streamboardId, version, fields, jsonSchema }` document the
   * server derives from the latest spec's `{ $bind: "path" }` refs.
   *
   * Powers `streamboard-codegen` (which folds `fields[].tsType` into a
   * nested `StreamboardState` interface) and any runtime validation a
   * caller wants to do before pushing.
   */
  async schema(options: SchemaOptions = {}): Promise<SchemaResult> {
    const id = options.streamboardId ?? this.streamboardId
    const url = this.boardUrl(id, "/schema")
    const raw = await this.requestWithRetries(
      url,
      { method: "GET" },
      options.signal,
    )
    const data = raw as Partial<SchemaResult> | null
    if (
      !data ||
      typeof data.streamboardId !== "string" ||
      typeof data.version !== "string" ||
      !Array.isArray(data.fields) ||
      // Each field must carry the `path` + `tsType` codegen reads; a
      // field missing either would silently emit malformed output.
      !data.fields.every(
        (f) =>
          typeof f === "object" &&
          f !== null &&
          typeof (f as { path?: unknown }).path === "string" &&
          typeof (f as { tsType?: unknown }).tsType === "string",
      )
    ) {
      throw new StreamboardError(
        "protocol",
        "Unexpected schema() response body shape",
      )
    }
    return data as SchemaResult
  }

  /**
   * Build the data-API URL for this board. With an explicit id, targets
   * `/streamboards/:id`; without, the token-scoped `/board` route, where
   * the server reads the board off the token row.
   */
  private boardUrl(id: string | undefined, suffix = ""): string {
    const base = `${this.baseUrl}/api/data/v1`
    return id
      ? `${base}/streamboards/${encodeURIComponent(id)}${suffix}`
      : `${base}/board${suffix}`
  }

  private async requestWithRetries(
    url: string,
    init: { method: "GET" | "POST"; body?: string },
    signal: AbortSignal | undefined,
  ): Promise<unknown> {
    let lastRetryAfterMs: number | null = null
    let attempt = 0

    while (true) {
      attempt++
      if (signal?.aborted) {
        throw new StreamboardError("aborted", "Request aborted by caller")
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.token}`,
      }
      if (init.method === "POST") {
        headers["Content-Type"] = "application/json"
      }

      let res: Response
      try {
        res = await this.fetchImpl(url, {
          method: init.method,
          headers,
          body: init.body,
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
        const data = await res.json().catch(() => null)
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
      reject(new StreamboardError("aborted", "Request aborted by caller"))
      return
    }
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(new StreamboardError("aborted", "Request aborted by caller"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}
