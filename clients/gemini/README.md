# MemCard for Gemini CLI

Connect MemCard's spaced-repetition flashcard tools to the Gemini CLI via MCP.

## How it works

The MemCard MCP server at `mcp.memcard.dev` is an OAuth-enabled remote MCP server. Gemini CLI connects to it directly over HTTP — no local proxy needed. Authentication uses GitHub sign-in via Better Auth.

## Setup

1. Copy the config into your project (or merge with your existing settings):

```bash
cp -r integrations/gemini/.gemini .gemini
```

Or add the `memcard` entry to your existing `.gemini/settings.json`:

```json
{
  "mcpServers": {
    "memcard": {
      "httpUrl": "https://mcp.memcard.dev/mcp"
    }
  }
}
```

2. The settings file can live in your project root or your home directory (`~/.gemini/settings.json`)
3. On first use, authenticate via OAuth — you'll be redirected to sign in with GitHub

## Available tools

| Tool | Description |
|---|---|
| `list_decks` | List all decks with card and due counts |
| `get_deck` | Get deck details and all cards |
| `create_deck` | Create a new deck |
| `update_deck` | Update deck title or description |
| `delete_deck` | Delete a deck and all cards |
| `create_card` | Create a flashcard in a deck |
| `update_card` | Update a flashcard |
| `delete_card` | Delete a flashcard |
| `get_due_cards` | Get cards due for review |
| `submit_review` | Submit pass/fail for a card |
| `reset_card` | Reset card to box 1 |

## Note on other Gemini platforms

- **Gemini Enterprise**: Supports custom MCP server connectors (currently in preview, requires allowlist access). Use the same URL: `https://mcp.memcard.dev/mcp`
- **Gemini web app** (gemini.google.com): Does not support custom MCP connectors yet.
