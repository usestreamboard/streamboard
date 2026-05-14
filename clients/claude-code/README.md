# Streamboard Plugin for Claude Code

A Claude Code plugin that connects to the Streamboard MCP server for authoring generative-UI dashboards (KPI tiles, charts, tables) and pushing live data into them.

## Prerequisites

- A Streamboard account (email/password or OAuth)
- The hosted MCP server at `mcp.usestreamboard.com` (no self-host needed)

## Installation

**Local development:**

```bash
claude --plugin-dir ./plugins/streamboard
```

**First-time setup:** Run `/mcp` in Claude Code to authenticate with the Streamboard server via OAuth.

## MCP tools available

| Tool | Description |
|---|---|
| `create_streamboard` | Author a new streamboard from a json-render spec |
| `update_streamboard` | Append a new version to an existing streamboard |
| `get_streamboard` | Read spec + metadata (optionally pinned to a version) |
| `list_versions` | List every version of a streamboard |
| `delete_streamboard` | Permanent delete (owner / org admin only) |

## Example prompts

- *"Build me a streamboard with four KPI tiles (MRR, active users, churn, NPS) and a weekly-signups area chart. Make the chart data bindable so I can push fresh values."*
- *"Update streamboard `<id>` to add a 'Top regions' bar chart underneath the existing tiles."*
- *"Show me version 3 of streamboard `<id>` and explain what changed since v1."*

After authoring, mint a per-board data token at `/app/s/:id/tokens` and wire your worker (via [`@streamboard/sdk`](../sdk/)) or CI script (via `streamboard streamboards push <id>`) to push live values into the bindable slots.
