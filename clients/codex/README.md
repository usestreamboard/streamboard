# Streamboard Integration for OpenAI Codex

A Codex integration that connects to the Streamboard MCP server for authoring generative-UI dashboards and pushing live data into them.

## Prerequisites

- [Codex CLI](https://github.com/openai/codex) installed
- A Streamboard account (email/password or OAuth)
- The hosted MCP server at `mcp.usestreamboard.com` (no self-host needed)

## Installation

1. Copy the config into your project (or merge with your existing config):

```bash
cp -r integrations/codex/.codex .codex
```

2. Trust the project when Codex prompts you, so it picks up `.codex/config.toml`.

3. Authenticate with the Streamboard MCP server on first use — Codex will handle the OAuth flow.

## MCP tools available

| Tool | Description |
|---|---|
| `create_streamboard` | Author a new streamboard from a json-render spec |
| `update_streamboard` | Append a new version to an existing streamboard |
| `get_streamboard` | Read spec + metadata (optionally pinned to a version) |
| `list_versions` | List every version of a streamboard |
| `delete_streamboard` | Permanent delete (owner / org admin only) |

## Project Instructions

Copy `AGENTS.md` to your project root to give Codex context about the Streamboard system:

```bash
cp integrations/codex/AGENTS.md AGENTS.md
```

## Pushing live data

After authoring a streamboard, mint a per-board data token at `/app/s/:id/tokens` in the web app. Use [`@streamboard/sdk`](../sdk/) from your worker or `streamboard streamboards push <id>` from the CLI to push values into bindable slots.
