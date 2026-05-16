# Streamboard for Claude Desktop

Connect Streamboard's generative-UI dashboard tools to Claude Desktop as a remote MCP connector. Author KPI tiles, charts, and tables as versioned json-render specs; push live data into bindable slots from your own runtime.

## How it works

The Streamboard MCP server at `mcp.usestreamboard.com` is an OAuth-enabled remote MCP server. Claude Desktop connects to it directly over HTTP — no local extension or proxy needed. The server acts as the OAuth provider via `@cloudflare/workers-oauth-provider`, with GitHub sign-in handled by Better Auth.

**OAuth endpoints** (all on `mcp.usestreamboard.com`):
- `/register` — Dynamic client registration
- `/authorize` — Authorization (redirects to GitHub sign-in)
- `/token` — Token exchange
- `/mcp` — MCP API (Streamable HTTP transport)

## Setup

1. Open **Claude Desktop** > **Settings** > **Connectors**
2. Click **Add custom connector**
3. Enter the URL: `https://mcp.usestreamboard.com/mcp`
4. Click **Add**
5. On first use, you'll be redirected to sign in with GitHub

## Available tools

| Tool | Description |
|---|---|
| `create_streamboard` | Author a new streamboard from a json-render spec |
| `update_streamboard` | Append a new version to an existing streamboard |
| `get_streamboard` | Read the spec + metadata for a streamboard |
| `get_streamboard_data` | Read live pushed state + binding contract (latest spec); catches `$bind` typos/drift |
| `list_versions` | List every version of a streamboard |
| `delete_streamboard` | Permanent delete (owner / org admin only) |

## Submitting to the Connectors Directory

To distribute via the [Anthropic Connectors Directory](https://support.claude.com/en/articles/12922832-local-mcp-server-submission-guide), the server needs:
- Tool annotations on all tools
- A privacy policy
- At least three working examples
- Testing credentials
