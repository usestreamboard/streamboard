# MemCard for ChatGPT

Connect MemCard's spaced-repetition flashcard tools to ChatGPT.

## Option 1: MCP Connector (Recommended)

ChatGPT natively supports MCP. Your existing MCP server at `mcp.memcard.dev` works directly — no Custom GPT or plugin needed.

**Requirements**: ChatGPT Business, Enterprise, or Edu plan with developer mode enabled.

### Setup

1. Open **ChatGPT** > **Settings** > **Connectors**
2. Click **Create**
3. Enter the URL: `https://mcp.memcard.dev/mcp`
4. Click **Save**
5. Open a new chat, click **+** near the message composer, click **More**, and select the memcard connector
6. On first use, you'll be redirected to sign in with GitHub

### Available tools

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
| `batch_create_cards` | Create up to 100 cards at once |
| `batch_update_cards` | Update up to 100 cards at once |
| `get_due_cards` | Get cards due for review |
| `submit_review` | Submit pass/fail for a card |
| `reset_card` | Reset card to box 1 |

---

## Option 2: Custom GPT Action (Legacy)

For ChatGPT Plus or Free users without MCP connector support, you can create a Custom GPT with actions.

### Setup

1. Go to [ChatGPT](https://chat.openai.com) and create a new GPT
2. In the **Configure** tab, scroll to **Actions** and click **Create new action**
3. Set the **Schema** to import from: `https://memcard.dev/api/openapi.json`
4. Set **Authentication** to **OAuth**:
   - **Client ID**: Your OAuth client ID (from MCP OAuth registration)
   - **Client Secret**: Your OAuth client secret
   - **Authorization URL**: `https://mcp.memcard.dev/authorize`
   - **Token URL**: `https://mcp.memcard.dev/token`
   - **Scope**: (leave empty)
5. Copy the **Callback URL** from ChatGPT and add it to your OAuth provider's allowed redirect URIs
6. Use the `description_for_model` from `ai-plugin.json` as part of your GPT's system instructions

---

## Troubleshooting

**"Connector not available"**: MCP connectors require ChatGPT Business, Enterprise, or Edu plans with developer mode enabled. Use the Custom GPT Action approach (Option 2) for Plus/Free plans.

**OAuth errors**: Verify the MCP server is reachable at `https://mcp.memcard.dev/mcp` and that your GitHub OAuth app is configured correctly.

**Tools not appearing**: After adding the connector, you must explicitly enable it in each chat via the **+** button > **More** > select memcard.

## Files

- `ai-plugin.json` — ChatGPT Action manifest template for Option 2 (update placeholder values before use)
