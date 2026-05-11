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
  meta: { name: "ls", description: "List dashboards" },
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
      client.dashboards.list({
        limit: Number(args.limit),
        offset: Number(args.offset),
      }),
    )
    output(data, args.pretty)
  },
})

const get = defineCommand({
  meta: { name: "get", description: "Get a dashboard's spec and metadata" },
  args: {
    id: { type: "positional", description: "Dashboard ID", required: true },
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
      client.dashboards.get({
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
    description: "Create a dashboard from a json-render spec on stdin",
  },
  args: {
    title: {
      type: "positional",
      description: "Dashboard title",
      required: true,
    },
    public: {
      type: "boolean",
      description: "Make dashboard publicly viewable (default: true)",
      default: true,
    },
    preset: {
      type: "string",
      description:
        "shadcn-presets code (e.g. 'b1ZjC5Fqt') for the dashboard theme",
    },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const spec = await readStdin<unknown>()
    const client = requireClient()
    const data = await rpc(() =>
      client.dashboards.create({
        title: args.title,
        spec,
        isPublic: args.public,
        themePreset: args.preset ?? undefined,
      }),
    )
    output({ ...data, url: viewerUrl(data.id) }, args.pretty)
  },
})

const update = defineCommand({
  meta: {
    name: "update",
    description:
      "Append a new version to a dashboard from a json-render spec on stdin",
  },
  args: {
    id: { type: "positional", description: "Dashboard ID", required: true },
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
    const spec = await readStdin<unknown>()
    const client = requireClient()
    // tri-state: omit → undefined (inherit), "-" → null (clear), value → set.
    const themePreset =
      args.preset === undefined
        ? undefined
        : args.preset === "-"
          ? null
          : args.preset
    const data = await rpc(() =>
      client.dashboards.update({ id: args.id, spec, themePreset }),
    )
    output({ ...data, url: viewerUrl(data.id) }, args.pretty)
  },
})

const rm = defineCommand({
  meta: { name: "rm", description: "Delete a dashboard and all its versions" },
  args: {
    id: { type: "positional", description: "Dashboard ID", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() => client.dashboards.delete({ id: args.id }))
    output(data, args.pretty)
  },
})

const versions = defineCommand({
  meta: { name: "versions", description: "List all versions of a dashboard" },
  args: {
    id: { type: "positional", description: "Dashboard ID", required: true },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const client = requireClient()
    const data = await rpc(() =>
      client.dashboards.listVersions({ id: args.id }),
    )
    output(data, args.pretty)
  },
})

export const dashboardsCommand = defineCommand({
  meta: { name: "dashboards", description: "Manage dashboards" },
  subCommands: { ls, get, create, update, rm, versions },
})
