# streamboard

> Open-source CLI, SDKs, and MCP client glue for [streamboard](https://usestreamboard.com) — a generative-UI MCP server that lets any MCP-aware LLM persist, version, and share live UI as [json-render](https://www.npmjs.com/package/@json-render/core) specs.

The hosted MCP server is at **`https://mcp.usestreamboard.com/mcp`**. This repo houses the client-side tooling that talks to it: a CLI, two SDKs, and config recipes for popular MCP clients.

## What's in here

| Path | What | Published as |
|---|---|---|
| [`cli/`](./cli) | `streamboard` CLI — list, codegen, push live data | [`streamboard`](https://npmjs.com/package/streamboard) on npm |
| [`sdk-js/`](./sdk-js) | TypeScript SDK for push/pull from Workers, crons, agents | [`@streamboard/sdk`](https://npmjs.com/package/@streamboard/sdk) on npm |
| [`sdk-python/`](./sdk-python) | Python SDK | [`streamboard`](https://pypi.org/project/streamboard) on PyPI |
| [`clients/claude-code/`](./clients/claude-code) | Claude Code plugin + skills | — |
| [`clients/claude-desktop/`](./clients/claude-desktop) | Claude Desktop MCP config recipe | — |
| [`clients/cursor/`](./clients/cursor) | Cursor MCP config | — |
| [`clients/codex/`](./clients/codex) | OpenAI Codex skills + config | — |
| [`clients/gemini/`](./clients/gemini) | Gemini settings recipe | — |
| [`clients/chatgpt-app/`](./clients/chatgpt-app) | ChatGPT app manifest | — |
| [`clients/chatgpt-action/`](./clients/chatgpt-action) | ChatGPT action plugin spec | — |

## Bridge type package

The CLI consumes `@streamboard/api-types` at build time for end-to-end type safety against the hosted oRPC API. That package is published to npm from a separate private repo (it's regenerated against the live server schema). In this repo, `cli/package.json` references it as `"@streamboard/api-types": "^0.1.0"` — a placeholder version that resolves **once the package is published to npm**. Until then, `pnpm install` and `cli` typecheck will fail to resolve that dep. That's expected and tracked.

## Quickstart

```sh
# install CLI globally (once published)
npm i -g streamboard
streamboard login
streamboard streamboards ls

# or use the SDK from a Worker / agent
pnpm add @streamboard/sdk
```

```python
# python SDK
pip install streamboard
```

## Development

This monorepo uses pnpm workspaces and Turbo. Python lives in `sdk-python/` and is managed with `uv`.

```sh
pnpm install
pnpm -r build
pnpm -r typecheck
pnpm -r test
```

## Releases

Tags drive npm/PyPI publishing via GitHub Actions:

- `cli-v*` → `streamboard` on npm
- `sdk-js-v*` → `@streamboard/sdk` on npm
- `sdk-python-v*` → `streamboard` on PyPI

Required secrets: `NPM_TOKEN`, `PYPI_TOKEN`.

## License

MIT. See [LICENSE](./LICENSE).
