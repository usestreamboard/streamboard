import { defineCommand } from "citty"
import { requireClient, rpc } from "../lib/auth"
import { resolveAuth } from "../lib/config"
import { output } from "../lib/output"
import { readStdin } from "../lib/stdin"

function viewerUrl(id: string): string {
  const auth = resolveAuth()
  const base = (auth?.apiUrl ?? "https://usestreamboard.com").replace(/\/$/, "")
  return `${base}/d/${id}`
}

const ls = defineCommand({
  meta: { name: "ls", description: "List streamboards" },
  args: {
    limit: {
      type: "string",
      description: "Max results (1–100)",
      default: "50",
    },
    offset: {
      type: "string",
      description: "Pagination offset",
      default: "0",
    },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() =>
      client.streamboards.list({
        limit: Number(args.limit),
        offset: Number(args.offset),
      }),
    )
    output(data, args.pretty)
  },
})

const get = defineCommand({
  meta: { name: "get", description: "Get a streamboard's spec and metadata" },
  args: {
    id: { type: "positional", description: "Streamboard ID", required: true },
    version: {
      type: "string",
      description: "Specific version (default: latest)",
    },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() =>
      client.streamboards.get({
        id: args.id,
        version: args.version ? Number(args.version) : undefined,
      }),
    )
    output(data, args.pretty)
  },
})

const create = defineCommand({
  meta: {
    name: "create",
    description: "Create a streamboard from a json-render spec on stdin",
  },
  args: {
    title: {
      type: "positional",
      description: "Streamboard title",
      required: true,
    },
    public: {
      type: "boolean",
      description: "Make streamboard publicly viewable (default: true)",
      default: true,
    },
    preset: {
      type: "string",
      description:
        "shadcn-presets code (e.g. 'b1ZjC5Fqt') for the streamboard theme",
    },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    // The oRPC `streamboards.create` route is currently disabled — writes
    // happen exclusively via the MCP server (`apps/mcp/src/tools/streamboards.ts`).
    // The CLI's `create`/`update` commands will be re-enabled once the
    // browser-side AI chat surface ships and the procedure is re-exported.
    // See `packages/api/src/orpc/routes/streamboards.ts` and REVIEW.md #3.
    void args
    void readStdin
    void requireClient
    void rpc
    void output
    void viewerUrl
    console.error(
      'streamboards create is currently MCP-only. Wire your MCP client to streamboard and call the "create_streamboard" tool.',
    )
    process.exit(2)
  },
})

const update = defineCommand({
  meta: {
    name: "update",
    description:
      "Append a new version to a streamboard from a json-render spec on stdin",
  },
  args: {
    id: { type: "positional", description: "Streamboard ID", required: true },
    preset: {
      type: "string",
      description: "shadcn-presets code; pass '-' to clear; omit to inherit",
    },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    // See the `create` command above — same reason.
    void args
    console.error(
      'streamboards update is currently MCP-only. Wire your MCP client to streamboard and call the "update_streamboard" tool.',
    )
    process.exit(2)
  },
})

const rm = defineCommand({
  meta: {
    name: "rm",
    description: "Delete a streamboard and all its versions",
  },
  args: {
    id: { type: "positional", description: "Streamboard ID", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() => client.streamboards.delete({ id: args.id }))
    output(data, args.pretty)
  },
})

const versions = defineCommand({
  meta: { name: "versions", description: "List all versions of a streamboard" },
  args: {
    id: { type: "positional", description: "Streamboard ID", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() =>
      client.streamboards.listVersions({ id: args.id }),
    )
    output(data, args.pretty)
  },
})

export const streamboardsCommand = defineCommand({
  meta: { name: "streamboards", description: "Manage streamboards" },
  subCommands: { ls, get, create, update, rm, versions },
})
