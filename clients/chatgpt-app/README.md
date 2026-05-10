# MemCard ChatGPT App

This directory contains the configuration for publishing MemCard as a ChatGPT App via the OpenAI Apps SDK.

## Architecture

The ChatGPT App uses the same MCP server as the Claude Desktop/Code integrations (`apps/mcp/`), with two additions:

1. **UI Widgets** — Interactive HTML widgets rendered in ChatGPT's iframe sandbox:
   - `review-card.html` — Flashcard review with flip-to-reveal and pass/fail buttons
   - `deck-list.html` — Overview of all decks with card counts and due counts

2. **App Metadata** — `app-manifest.json` with name, description, logo, and auth config for the Apps Directory listing.

Tools that have widgets use `registerAppTool` from `@modelcontextprotocol/ext-apps/server` and return both `content` (text for the model) and `structuredContent` (data for the widget). Clients that don't support widgets (Claude, other MCP clients) simply ignore the `structuredContent` and `_meta.ui` fields and use `content` as usual.

## How widgets work

1. Tool is called (e.g. `get_due_cards`)
2. Response includes `_meta.ui.resourceUri` pointing to a `ui://` resource
3. ChatGPT fetches the widget HTML via `resources/read`
4. Widget renders in a sandboxed iframe
5. Widget reads tool output from `window.openai.toolOutput`
6. Widget can call other tools via `window.openai.callTool` (e.g. `submit_review`)

## Publishing to the ChatGPT Apps Directory

### Prerequisites

- OpenAI organization with Admin/Owner access
- MCP server deployed and reachable at `https://mcp.memcard.dev/mcp`
- Privacy policy and terms of service URLs live

### Steps

1. Go to **Workplace Settings > Apps** in ChatGPT
2. Click **Create App**
3. Enter the MCP server URL: `https://mcp.memcard.dev/mcp`
4. Fill in metadata from `app-manifest.json`
5. Test all tools and widgets in draft mode
6. Click **Publish** from the **Drafts** tab
7. Review safety warnings (write actions like `create_deck`, `submit_review` will be flagged)

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
