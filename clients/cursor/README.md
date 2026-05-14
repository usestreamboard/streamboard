# Streamboard for Cursor

Connect Streamboard's generative-UI dashboard tools to Cursor via MCP. Author KPI tiles, charts, and tables as versioned json-render specs; push live data into bindable slots from your own runtime.

## How it works

The Streamboard MCP server at `mcp.usestreamboard.com` is an OAuth-enabled remote MCP server. Cursor connects to it directly over Streamable HTTP — no local proxy needed. Authentication uses GitHub sign-in via Better Auth.

## Setup

### Option 1: Config file

Copy the config into your project:

```bash
cp -r integrations/cursor/.cursor .cursor
```

Or add the `streamboard` entry to your existing `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "streamboard": {
      "type": "http",
      "url": "https://mcp.usestreamboard.com/mcp"
    }
  }
}
```

The config can be project-scoped (`.cursor/mcp.json`) or global (`~/.cursor/mcp.json`).

### Option 2: Cursor Settings UI

1. Open **Cursor** → **Settings** → **Tools & MCP**
2. Click **New MCP Server**
3. Enter the URL: `https://mcp.usestreamboard.com/mcp`
4. Set transport to **Streamable HTTP**
5. On first use, authenticate via OAuth in your browser

## Available tools

| Tool | Description |
|---|---|
| `create_streamboard` | Author a new streamboard from a json-render spec |
| `update_streamboard` | Append a new version to an existing streamboard |
| `get_streamboard` | Read the spec + metadata for a streamboard |
| `list_versions` | List every version of a streamboard |
| `delete_streamboard` | Permanent delete (owner / org admin only) |

## Notes

- Cursor supports MCP OAuth natively since v1.0 (June 2025)
- Tools are available in Agent mode — use Composer with Agent selected
- Cursor's practical limit is ~40 active tools across all MCP servers
