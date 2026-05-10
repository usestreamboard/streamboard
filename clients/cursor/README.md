# MemCard for Cursor

Connect MemCard's spaced-repetition flashcard tools to Cursor via MCP.

## How it works

The MemCard MCP server at `mcp.memcard.dev` is an OAuth-enabled remote MCP server. Cursor connects to it directly over Streamable HTTP — no local proxy needed. Authentication uses GitHub sign-in via Better Auth.

## Setup

### Option 1: Config file

Copy the config into your project:

```bash
cp -r integrations/cursor/.cursor .cursor
```

Or add the `memcard` entry to your existing `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "memcard": {
      "type": "http",
      "url": "https://mcp.memcard.dev/mcp"
    }
  }
}
```

The config can be project-scoped (`.cursor/mcp.json`) or global (`~/.cursor/mcp.json`).

### Option 2: Cursor Settings UI

1. Open **Cursor** → **Settings** → **Tools & MCP**
2. Click **New MCP Server**
3. Enter the URL: `https://mcp.memcard.dev/mcp`
4. Set transport to **Streamable HTTP**
5. On first use, authenticate via OAuth in your browser

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

## Notes

- Cursor supports MCP OAuth natively since v1.0 (June 2025)
- Tools are available in Agent mode — use Composer with Agent selected
- Cursor's practical limit is ~40 active tools across all MCP servers
