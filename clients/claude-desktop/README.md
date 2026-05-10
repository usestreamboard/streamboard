# Streamboard for Claude Desktop

Connect Streamboard's spaced-repetition flashcard tools to Claude Desktop as a remote MCP connector.

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

## Submitting to the Connectors Directory

To distribute via the [Anthropic Connectors Directory](https://support.claude.com/en/articles/12922832-local-mcp-server-submission-guide), the server needs:
- Tool annotations on all tools
- A privacy policy
- At least three working examples
- Testing credentials
