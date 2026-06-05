# @streamboard/sdk

Tiny TypeScript client for streaming live data **to and from** a [streamboard](https://usestreamboard.com) from crons, agents, or Workers.

```bash
pnpm add @streamboard/sdk
```

```ts
import { Streamboard } from "@streamboard/sdk"

// The server resolves which board this token targets — no id needed.
const board = new Streamboard({ token: process.env.STREAMBOARD_TOKEN! })

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

- `push(state)` — write the envelope (`POST /api/data/v1/board`)
- `pull()` — read the current envelope (`GET /api/data/v1/board`)

## Auth

Mint a per-streamboard data token in the streamboard web app at `/app/s/:id/tokens`. The token format is `sb_d_<id>_<secret>`. Each token belongs to exactly one board, so the server resolves the target board from the token itself — you pass nothing but the bearer. The same token authorizes `push`, `pull`, and `schema`.

> The token's `<id>` segment is the *token's* own id, not the board id — they're independent, so the board can't be parsed from the token. Set `streamboardId` only to address a board explicitly (e.g. a token-broker swapping one id per call); when set, the SDK targets `/streamboards/:id` instead of the token-scoped `/board` route.

## API

```ts
new Streamboard<TState>({
  token: string,                  // required, sb_d_<id>_<secret>
  streamboardId?: string,         // optional override; default resolves the board from the token
  baseUrl?: string,               // default: https://usestreamboard.com
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

// Type contract (powers codegen)
await board.schema({ signal?: AbortSignal, streamboardId?: string })
//   → { streamboardId, version, fields, jsonSchema }
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

This package ships its own codegen — no extra install. Point it at a board you hold a data token for to generate a typed `StreamboardState` interface plus matching `push()` / `pull()` helpers. Only the token is required — the server resolves the board from it:

```bash
# token from the env (STREAMBOARD_TOKEN), write to a file
STREAMBOARD_TOKEN=sb_d_… npx streamboard-codegen -o src/streamboard.generated.ts

# or pass the token explicitly / print to stdout
npx streamboard-codegen --token sb_d_… --stdout
```

```
streamboard-codegen [board-id] [options]
  [board-id]       Optional board id — the `<id>` in /s/<id>. Omit it and the
                   server resolves the board from the token; pass it to
                   target one explicitly.
  --token <t>      Data token (sb_d_…). Defaults to env STREAMBOARD_TOKEN.
  --id <id>        Board id, as an alternative to the positional argument.
  --base-url <u>   API base URL. Default: https://usestreamboard.com
  -o, --out <f>    Output file. Default: stdout.
  --stdout         Force output to stdout.
```

> Prefer `STREAMBOARD_TOKEN` over `--token`: a token passed on the command line leaks into shell history and the process list. Use `--token` only in throwaway/CI contexts where the secret is already scoped.

The generated file exports both helpers wrapped around this SDK, so importing `pull` / `push` from it gives compile-time checks against the spec's bindable slots. It also re-exports the typed `StreamboardState` for use with the raw client:

```ts
import { Streamboard } from "@streamboard/sdk"
import type { StreamboardState } from "./streamboard.generated"

const board = new Streamboard<StreamboardState>({
  token: process.env.STREAMBOARD_TOKEN!,
})
```

Prefer to drive it yourself? `board.schema()` returns the raw `{ streamboardId, version, fields, jsonSchema }` contract, and `generate(doc)` (exported from `@streamboard/sdk/codegen`) turns it into the module string.

> The richer [`@streamboard/cli`](https://github.com/usestreamboard/streamboard/tree/main/cli) ships the same codegen as `streamboard streamboards codegen <id>` alongside full board management.

## See also

- [streamboard docs](https://usestreamboard.com)
- The [streamboard MCP server](https://github.com/usestreamboard/streamboard) — how the spec is authored

## License

MIT
