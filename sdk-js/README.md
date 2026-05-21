# @streamboard/sdk

Tiny TypeScript client for streaming live data **to and from** a [streamboard](https://usestreamboard.com) from crons, agents, or Workers.

```bash
pnpm add @streamboard/sdk
```

```ts
import { Streamboard } from "@streamboard/sdk"

const board = new Streamboard({
  token: process.env.STREAMBOARD_TOKEN!,
})

// Push fresh values into the spec's bindable slots
await board.push({
  kpis: { mrr: { value: "$48.2k", delta: "+4%", trend: "up" } },
  runs: { recent: [{ at: "10:02", duration: 240 }] },
})
// → { ok: true, updatedAt: 1778670000 }

// Read the current envelope back (e.g. for diffing, monitoring, secondary workers)
const snapshot = await board.pull()
// → { streamboardId, version, updatedAt, state: { kpis: { ... } } }
```

## What it does

Streamboards are persistent, versioned, generative-UI documents. The structure (KPI tiles, charts, tables) is authored once via an LLM through the streamboard MCP server. The values inside those slots are pushed at runtime by your code — no LLM cost per refresh.

This SDK is the runtime-data half: one HTTP call per refresh, bearer-authenticated, ~1.5 kB gzipped, zero dependencies. Supports both directions:

- `push(state)` — write the envelope (`POST /api/data/v1/streamboards/<id>`)
- `pull()` — read the current envelope (`GET /api/data/v1/streamboards/<id>`)

## Auth

Mint a per-streamboard data token in the streamboard web app at `/app/s/:id/tokens`. The token format is `sb_d_<id>_<secret>` — the SDK extracts the target streamboardId from the prefix so you don't have to pass it twice. The same token authorizes both `push` and `pull`.

## API

```ts
new Streamboard<TState>({
  token: string,                  // required, sb_d_<id>_<secret>
  baseUrl?: string,               // default: https://usestreamboard.com
  streamboardId?: string,         // override the id parsed from the token
  fetch?: typeof fetch,           // inject a custom fetch (tests, polyfills)
  retries?: number,               // default: 3 (429 + 5xx, exponential w/ jitter)
})

// Write
await board.push(state, { signal?: AbortSignal, streamboardId?: string })
//   → { ok: true, updatedAt: number }

// Read
await board.pull({ signal?: AbortSignal, streamboardId?: string })
//   → { streamboardId, version, updatedAt, state }
//   `state` is always an object — `{}` when no push has happened yet.
//   `updatedAt` is null in that no-state case.
```

`TState` is an optional generic that types both directions in lockstep. Use the CLI's [codegen](#typed-state-envelopes) to derive it from the spec's `$bind` refs.

### Error types

Every error is an instance of `StreamboardError`. Specific subclasses for branching:

| Class | HTTP | Action |
|---|---|---|
| `StreamboardAuthError` | 401 | Token invalid / revoked. Mint a new one. |
| `StreamboardNotFoundError` | 404 | Streamboard deleted. Check the id. |
| `StreamboardPayloadError` | 400 / 413 | Body wrong shape or over 64 KB. |
| `StreamboardRateLimitError` | 429 | Retried `retries` times and still 429. Carries `retryAfterMs`. |
| `StreamboardError` | various | Network, 5xx-after-retries, protocol oddity. Inspect `kind` + `status`. |

## Footprint

- ESM + CJS builds, full TypeScript types.
- Zero runtime dependencies.
- Works on: Node 18+, Bun, Deno, Cloudflare Workers, browsers (CORS allowing).

## Live-data semantics

- **Last-write-wins.** Each `.push()` overwrites the entire state envelope on the server. Pass the FULL shape every call; partial pushes drop unmentioned slots back to spec defaults.
- **64 KB cap per push.** SDK rejects oversized payloads before the HTTP call.
- **Viewer reads the freshest state on every render** (cached at the edge for ~60 s).
- **`.pull()` reads the same row the viewer reads** — same edge cache window applies, so a `pull` immediately after a `push` is typically the row you just wrote, but may briefly serve the previous value while the edge invalidates.
- **Reads are idempotent + retry-safe.** `pull` follows the same 429 / 5xx retry policy as `push`. No body cap on the response (server caps writes, never reads).

## Typed state envelopes

Run the CLI codegen against any streamboard you have a data token for to generate a typed `StreamboardState` interface plus matching `push()` / `pull()` helpers:

```bash
npx streamboard streamboards codegen <streamboard-id> --out src/streamboard.generated.ts
```

The generated file exports both helpers wrapped around this SDK, so importing `pull` / `push` from it gives compile-time checks against the spec's bindable slots.

## See also

- [streamboard docs](https://usestreamboard.com)
- The [streamboard MCP server](https://github.com/usestreamboard/streamboard) — how the spec is authored

## License

MIT
