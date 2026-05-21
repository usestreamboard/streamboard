# Streamboard ChatGPT App

This directory contains the configuration for publishing Streamboard as a ChatGPT App via the OpenAI Apps SDK.

## Architecture

The ChatGPT App uses the same MCP server as the Claude Desktop/Code integrations (`apps/mcp/`), surfacing the streamboard authoring tools (`create_streamboard`, `update_streamboard`, `get_streamboard`, `get_streamboard_data`, `list_versions`, `delete_streamboard`).

**App Metadata** lives in `app-manifest.json` — name, description, logo, and auth config for the Apps Directory listing.

Tools that ship structured output use `registerAppTool` from `@modelcontextprotocol/ext-apps/server` and return both `content` (text for the model) and `structuredContent` (data for downstream renderers). Clients that don't support structured content (Claude, other MCP clients) simply ignore the `structuredContent` + `_meta.ui` fields and use `content` as usual.

## Publishing to the ChatGPT Apps Directory

### Prerequisites

- OpenAI organization with Admin/Owner access
- MCP server deployed and reachable at `https://mcp.usestreamboard.com/mcp`
- Privacy policy and terms of service URLs live

### Steps

1. Go to **Workplace Settings > Apps** in ChatGPT
2. Click **Create App**
3. Enter the MCP server URL: `https://mcp.usestreamboard.com/mcp`
4. Fill in metadata from `app-manifest.json`
5. Test all tools and widgets in draft mode
6. Click **Publish** from the **Drafts** tab
7. Review safety warnings (write actions like `create_streamboard`, `update_streamboard`, `delete_streamboard` will be flagged)

### Testing locally

```bash
# Start the MCP server locally
cd apps/mcp
pnpm dev

# Expose via ngrok (ChatGPT requires HTTPS)
ngrok http 8787

# In ChatGPT: Settings > Connectors > Create > enter ngrok URL + /mcp
```

## Files

- `app-manifest.json` — App metadata for the ChatGPT Apps Directory
- `README.md` — This file
