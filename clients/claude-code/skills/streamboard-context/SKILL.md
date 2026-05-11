---
name: streamboard-context
description: Background knowledge about streamboard and available CLI commands for dashboards. Use when the user asks about streamboard dashboards, the CLI, or the MCP server.
user-invocable: false
---

# streamboard

streamboard is a generative-UI platform. LLMs (via MCP) and agents (via CLI) create and version dashboards as json-render specs. Humans view dashboards in the browser.

## CLI — Dashboards

All commands output compact JSON to stdout. Use `--pretty` for human-readable output.

- `streamboard dashboards ls` — List dashboards (latest version of each)
- `streamboard dashboards get <id>` — Get spec and metadata. Optional: `--version <n>`
- `echo '<json-render-spec>' | streamboard dashboards create <title>` — Create dashboard from spec on stdin. Optional: `--no-public` to keep private
- `echo '<json-render-spec>' | streamboard dashboards update <id>` — Append a new version
- `streamboard dashboards versions <id>` — List all versions oldest-first
- `streamboard dashboards rm <id>` — Delete dashboard and all versions

## Auth

- `streamboard auth status` — Check if authenticated (no network call)
- `streamboard login` — Interactive device flow login
- `streamboard auth request` — Start non-blocking device flow (returns device_code, user_code, verification_uri)
- `streamboard auth poll <device_code>` — Poll once; returns `{status: "pending"|"complete"}`
- `streamboard whoami` — Show current user

## MCP Server

The streamboard MCP server at `https://mcp.usestreamboard.com/mcp` exposes the same dashboard tools for MCP-aware clients (Claude Desktop, Cursor, etc.):
- `create_dashboard` — Create a new dashboard
- `update_dashboard` — Append a new version
- `get_dashboard` — Fetch spec by id/version
- `list_versions` — All versions of a dashboard
- `delete_dashboard` — Permanently delete

## Dashboard spec format

Dashboards are json-render specs — JSON objects with an `elements` map where each value has a `type` string matching an enabled component key. The exact schema depends on which components are enabled in your organization.
