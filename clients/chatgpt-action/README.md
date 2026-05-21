# Streamboard for ChatGPT

Connect Streamboard's generative-UI dashboard tools to ChatGPT. Author KPI tiles, charts, and tables as versioned json-render specs; push live data into bindable slots from your own runtime.

## Option 1: MCP Connector (Recommended)

ChatGPT natively supports MCP. Your existing MCP server at `mcp.usestreamboard.com` works directly — no Custom GPT or plugin needed.

**Requirements**: ChatGPT Business, Enterprise, or Edu plan with developer mode enabled.

### Setup

1. Open **ChatGPT** > **Settings** > **Connectors**
2. Click **Create**
3. Enter the URL: `https://mcp.usestreamboard.com/mcp`
4. Click **Save**
5. Open a new chat, click **+** near the message composer, click **More**, and select the streamboard connector
6. On first use, you'll be redirected to sign in with GitHub

### Available tools

| Tool | Description |
|---|---|
| `create_streamboard` | Author a new streamboard from a json-render spec |
| `update_streamboard` | Append a new version to an existing streamboard |
| `get_streamboard` | Read the spec + metadata for a streamboard |
| `get_streamboard_data` | Read live pushed state + binding contract (latest spec); catches `$bind` typos/drift |
| `list_versions` | List every version of a streamboard |
| `delete_streamboard` | Permanent delete (owner / org admin only) |

---

## Option 2: Custom GPT Action (Legacy)

For ChatGPT Plus or Free users without MCP connector support, you can create a Custom GPT with actions.

### Setup

1. Go to [ChatGPT](https://chat.openai.com) and create a new GPT
2. In the **Configure** tab, scroll to **Actions** and click **Create new action**
3. Set the **Schema** to import from: `https://usestreamboard.com/api/openapi.json`
4. Set **Authentication** to **OAuth**:
   - **Client ID**: Your OAuth client ID (from MCP OAuth registration)
   - **Client Secret**: Your OAuth client secret
   - **Authorization URL**: `https://mcp.usestreamboard.com/authorize`
   - **Token URL**: `https://mcp.usestreamboard.com/token`
   - **Scope**: (leave empty)
5. Copy the **Callback URL** from ChatGPT and add it to your OAuth provider's allowed redirect URIs
6. Use the `description_for_model` from `ai-plugin.json` as part of your GPT's system instructions

---

## Troubleshooting

**"Connector not available"**: MCP connectors require ChatGPT Business, Enterprise, or Edu plans with developer mode enabled. Use the Custom GPT Action approach (Option 2) for Plus/Free plans.

**OAuth errors**: Verify the MCP server is reachable at `https://mcp.usestreamboard.com/mcp` and that your GitHub OAuth app is configured correctly.

**Tools not appearing**: After adding the connector, you must explicitly enable it in each chat via the **+** button > **More** > select streamboard.

## Files

- `ai-plugin.json` — ChatGPT Action manifest template for Option 2 (update placeholder values before use)
