# Streamboard

Streamboard is a generative-UI dashboard service. You author dashboards (KPI tiles, charts, tables, callouts) as json-render specs through the MCP tools below, and the user pushes live data into bindable slots from their own runtime. This project connects to a remote MCP server at `mcp.usestreamboard.com` over Streamable HTTP — no self-host needed.

## Available MCP Tools

- `create_streamboard` — Author a new streamboard from a json-render spec. Returns `{id, version, url}`. Params: `title`, `spec`, `isPublic` (optional, default true), `themePreset` (optional shadcn-presets code)
- `update_streamboard` — Append a new version to an existing streamboard. Atomic version bump — safe under concurrent updates. Params: `id`, `spec`, `themePreset` (optional; omit to inherit, null to clear)
- `get_streamboard` — Read spec + metadata. Params: `id`, `version` (optional; omits to latest)
- `get_streamboard_data` — Read live pushed state + the binding contract derived from the latest spec; reconciles each `{ $bind }` path against real data (`present`/`sampleType`) and flags unbound state keys. Params: `id`
- `list_versions` — List every version of a streamboard, oldest first. Params: `id`
- `delete_streamboard` — Permanent delete (owner / org admin only). Params: `id`

## Spec authoring

Specs use the [json-render](https://npmjs.com/@json-render/core) format with a flat `elements` map. Components include `Card`, `Stack`, `Grid`, `Heading`, `Text`, `Alert`, `Badge`, `LineChart`, `AreaChart`, `BarChart`, `PieChart`, `KPI`, `StatGrid` (full catalog surfaced in the tool description).

For values that should update at runtime without re-authoring, use `{ $bind: "field.path" }` refs in any bindable slot — `KPI.value/delta/trend`, all chart `data` props, `StatGrid.stats`. The user then mints a per-streamboard data token in Settings and POSTs fresh state to `/api/data/v1/streamboards/<id>` via `@streamboard/sdk` or shell.
