---
name: streamboard-context
description: Background knowledge about streamboard and available CLI commands for streamboards. Use when the user asks about streamboard streamboards, the CLI, or the MCP server.
user-invocable: false
---

# streamboard

streamboard is a generative-UI platform. LLMs (via MCP) and agents (via CLI) create and version streamboards as json-render specs. Humans view streamboards in the browser.

## CLI — Streamboards

All commands output compact JSON to stdout. Use `--pretty` for human-readable output.

- `streamboard streamboards ls` — List streamboards (latest version of each)
- `streamboard streamboards get <id>` — Get spec and metadata. Optional: `--version <n>`
- `echo '<json-render-spec>' | streamboard streamboards create <title>` — Create streamboard from spec on stdin. Optional: `--no-public` to keep private
- `echo '<json-render-spec>' | streamboard streamboards update <id>` — Append a new version
- `streamboard streamboards versions <id>` — List all versions oldest-first
- `streamboard streamboards rm <id>` — Delete streamboard and all versions

## Auth

- `streamboard auth status` — Check if authenticated (no network call)
- `streamboard login` — Interactive device flow login
- `streamboard auth request` — Start non-blocking device flow (returns device_code, user_code, verification_uri)
- `streamboard auth poll <device_code>` — Poll once; returns `{status: "pending"|"complete"}`
- `streamboard whoami` — Show current user

## MCP Server

The streamboard MCP server at `https://mcp.usestreamboard.com/mcp` exposes the same streamboard tools for MCP-aware clients (Claude Desktop, Cursor, etc.):
- `create_streamboard` — Create a new streamboard
- `update_streamboard` — Append a new version
- `get_streamboard` — Fetch spec by id/version
- `list_versions` — All versions of a streamboard
- `delete_streamboard` — Permanently delete

## Streamboard spec format

Streamboards are json-render specs — JSON objects with an `elements` map where each value has a `type` string matching an enabled component key. The exact schema depends on which components are enabled in your organization.
