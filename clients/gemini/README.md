# Streamboard for Gemini CLI

Connect Streamboard's generative-UI dashboard tools to the Gemini CLI via MCP. Author KPI tiles, charts, and tables as versioned json-render specs; push live data into bindable slots from your own runtime.

## How it works

The Streamboard MCP server at `mcp.usestreamboard.com` is an OAuth-enabled remote MCP server. Gemini CLI connects to it directly over HTTP — no local proxy needed. Authentication uses GitHub sign-in via Better Auth.

## Setup

1. Copy the config into your project (or merge with your existing settings):

```bash
cp -r integrations/gemini/.gemini .gemini
```

Or add the `streamboard` entry to your existing `.gemini/settings.json`:

```json
{
  "mcpServers": {
    "streamboard": {
      "httpUrl": "https://mcp.usestreamboard.com/mcp"
    }
  }
}
```

2. The settings file can live in your project root or your home directory (`~/.gemini/settings.json`)
3. On first use, authenticate via OAuth — you'll be redirected to sign in with GitHub

## Available tools

| Tool | Description |
|---|---|
| `create_streamboard` | Author a new streamboard from a json-render spec |
| `update_streamboard` | Append a new version to an existing streamboard |
| `get_streamboard` | Read the spec + metadata for a streamboard |
| `get_streamboard_data` | Read live pushed state + binding contract (latest spec); catches `$bind` typos/drift |
| `list_versions` | List every version of a streamboard |
| `delete_streamboard` | Permanent delete (owner / org admin only) |

## Note on other Gemini platforms

- **Gemini Enterprise**: Supports custom MCP server connectors (currently in preview, requires allowlist access). Use the same URL: `https://mcp.usestreamboard.com/mcp`
- **Gemini web app** (gemini.google.com): Does not support custom MCP connectors yet.
