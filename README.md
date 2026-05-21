# streamboard

> Generative-UI streamboards. Your LLM writes the spec. You push the data. Every push is a new versioned URL.

[streamboard](https://usestreamboard.com) is a hosted MCP server for any
LLM that can call tools. The model authors a structured UI spec — KPI
tiles, charts, tables, with named slots for live values — and gets back
a permanent URL. Your own code (cron, agent loop, CI step, Worker) then
pushes data into those slots over a tiny HTTP API. Old links never
break.

This repo holds the **client-side** glue: the CLI, the TypeScript and
Python SDKs, and config recipes for popular MCP clients. The hosted
backend lives at [usestreamboard.com](https://usestreamboard.com).

---

## What's a streamboard?

A streamboard is a `json-render` spec stored against an immutable
`(id, version)` pair and served at a permanent URL. The spec defines
shape (which components, where they live, what they're called); the
data lives separately and is pushed at runtime. Every UI change mints a
new version — `/d/<id>` always serves the latest, `/d/<id>/<version>`
pins a frozen one. Free for public streamboards.

## Quick start

### From an MCP client (recommended)

Most users let an LLM write the spec for them. Wire the hosted MCP
server into any MCP-aware client:

```sh
claude mcp add streamboard --transport http https://mcp.usestreamboard.com/mcp
```

Then ask the model to build a streamboard. Other client configs (Cursor,
Codex, Claude Desktop, Gemini, ChatGPT) live under
[`clients/`](./clients).

### From the CLI

```sh
npm i -g streamboard
streamboard login
streamboard streamboards ls
```

The CLI also handles codegen and live-data push — see
[`cli/`](./cli) for the full command surface.

### From your code (push data)

TypeScript:

```ts
import { Streamboard } from "@streamboard/sdk"

const board = new Streamboard({ token: process.env.STREAMBOARD_TOKEN! })

await board.push({
  kpis: { mrr: { value: "$48.2k", delta: "+4%", trend: "up" } },
})
```

Python:

```python
from streamboard import Streamboard

board = Streamboard(token=os.environ["STREAMBOARD_TOKEN"])
board.push({"kpis": {"mrr": {"value": "$48.2k"}}})
```

Mint a data token at `/app/s/:id/tokens` once the streamboard exists.

## Docs

Full docs, MCP tool reference, and the spec catalog:
[usestreamboard.com/docs](https://usestreamboard.com/docs).

## Packages in this repo

| Package            | Install                       | What it does                                      |
| ------------------ | ----------------------------- | ------------------------------------------------- |
| `streamboard`      | `npm i -g streamboard`        | CLI — list, codegen, push, manage streamboards    |
| `@streamboard/sdk` | `npm i @streamboard/sdk`      | TypeScript client for pushing / pulling live data |
| `streamboard`      | `pip install streamboard`     | Python client (same surface as the TS SDK)        |

## MCP client configs

Drop-in recipes for the major MCP clients:

- [Claude Code](./clients/claude-code) — plugin + skills
- [Claude Desktop](./clients/claude-desktop)
- [Cursor](./clients/cursor)
- [Codex](./clients/codex)
- [Gemini](./clients/gemini)
- [ChatGPT (app)](./clients/chatgpt-app)
- [ChatGPT (action)](./clients/chatgpt-action)

## Contributing

This repo is a thin client layer over the hosted backend at
[usestreamboard.com](https://usestreamboard.com). See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the development setup,
release flow, and where to file issues.

## License

MIT — see [LICENSE](./LICENSE).
