# @streamboard/sdk

Tiny TypeScript client for pushing live data to a [streamboard](https://usestreamboard.com) from crons, agents, or Workers.

```bash
pnpm add @streamboard/sdk
```

```ts
import { Streamboard } from "@streamboard/sdk"

const board = new Streamboard({
  token: process.env.STREAMBOARD_TOKEN!,
})

await board.push({
  kpis: { mrr: { value: "$48.2k", delta: "+4%", trend: "up" } },
  runs: { recent: [{ at: "10:02", duration: 240 }] },
})
// → { ok: true, updatedAt: 1778670000 }
```

## What it does

Streamboards are persistent, versioned, generative-UI documents. The structure (KPI tiles, charts, tables) is authored once via an LLM through the streamboard MCP server. The values inside those slots are pushed at runtime by your code — no LLM cost per refresh.

This SDK is the runtime-data half: one POST per refresh, bearer-authenticated, ~1.5 kB gzipped, zero dependencies.

## Auth

Mint a per-streamboard data token in the streamboard web app at `/app/s/:id/tokens`. The token format is `sb_d_<id>_<secret>` — the SDK extracts the target streamboardId from the prefix so you don't have to pass it twice.

## API

```ts
new Streamboard({
  token: string,                  // required, sb_d_<id>_<secret>
  baseUrl?: string,               // default: https://usestreamboard.com
  streamboardId?: string,         // override the id parsed from the token
  fetch?: typeof fetch,           // inject a custom fetch (tests, polyfills)
  retries?: number,               // default: 3 (429 + 5xx, exponential w/ jitter)
})

await board.push(state, { signal?: AbortSignal, streamboardId?: string })
//   → { ok: true, updatedAt: number }
```

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

- Last-write-wins. Each `.push()` overwrites the entire state envelope on the server. Pass the FULL shape every call; partial pushes drop unmentioned slots back to spec defaults.
- 64 KB cap per push. SDK rejects oversized payloads before the HTTP call.
- Viewer reads the freshest state on every render (cached at the edge for ~60 s).

## See also

- [streamboard docs](https://usestreamboard.com)
- The [streamboard MCP server](https://github.com/cabljac/streamboard) — how the spec is authored

## License

MIT
