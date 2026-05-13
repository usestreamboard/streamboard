import { writeFileSync } from "node:fs"
import { resolve as resolvePath } from "node:path"
import { Streamboard, StreamboardError } from "@streamboard/sdk"
import {
  type BindField,
  buildStateInterfaceBody,
} from "@streamboard/streamboards"
import { defineCommand } from "citty"
import { requireClient, rpc } from "../lib/auth"
import { DEFAULT_API_URL, resolveAuth } from "../lib/config"
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
    const spec = await readStdin<unknown>()
    const client = requireClient()
    const data = await rpc(() =>
      client.streamboards.create({
        title: args.title,
        spec,
        isPublic: args.public,
        themePreset: args.preset ?? null,
      }),
    )
    output({ ...data, url: viewerUrl(data.id) }, args.pretty)
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
    const spec = await readStdin<unknown>()
    const client = requireClient()
    // `--preset` is tri-state: omit to inherit (undefined), `-` clears
    // (explicit null), any other string sets a preset code.
    const themePreset =
      args.preset === undefined
        ? undefined
        : args.preset === "-"
          ? null
          : args.preset
    const data = await rpc(() =>
      client.streamboards.update({
        id: args.id,
        spec,
        themePreset,
      }),
    )
    output({ ...data, url: viewerUrl(data.id) }, args.pretty)
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

// ─── Codegen ──────────────────────────────────────────────────────

const DATA_TOKEN_PREFIX = "sb_d_"

interface SchemaResponse {
  streamboardId: string
  version: number
  fields: BindField[]
}

/**
 * Render the codegen output: an interface mirroring every `$bind`
 * ref's state shape + a typed `push()` helper wrapping
 * `@streamboard/sdk`. Kept narrow on purpose — interfaces + a tiny
 * push wrapper, nothing else.
 */
export function renderCodegen(input: {
  streamboardId: string
  version: number
  baseUrl: string
  fields: BindField[]
}): string {
  const body = buildStateInterfaceBody(input.fields)
  return `// Generated by \`streamboard streamboards codegen ${input.streamboardId}\`.
// Do not edit by hand — re-run codegen after the spec mints a new version.
//
// Source: ${input.baseUrl}/api/data/v1/streamboards/${input.streamboardId}/schema
// Streamboard version: ${input.version}

import {
  Streamboard,
  type PushOptions,
  type PushResult,
} from "@streamboard/sdk"

/** State envelope shape for this streamboard. Derived from the spec's bindable slots. */
export interface StreamboardState {
${body}}

/**
 * Push a typed state envelope. Reads STREAMBOARD_TOKEN from
 * \`process.env\` by default; pass \`options.token\` to override
 * (e.g. when the caller resolves the token from a secrets store).
 */
export async function push(
  state: StreamboardState,
  options: PushOptions & { token?: string; baseUrl?: string } = {},
): Promise<PushResult> {
  const token = options.token ?? process.env.STREAMBOARD_TOKEN
  if (!token) {
    throw new Error(
      "Missing STREAMBOARD_TOKEN — set it in the environment or pass options.token.",
    )
  }
  const board = new Streamboard<StreamboardState>({
    token,
    baseUrl: options.baseUrl ?? ${JSON.stringify(input.baseUrl)},
  })
  const { token: _token, baseUrl: _baseUrl, ...rest } = options
  return board.push(state, rest)
}
`
}

const codegen = defineCommand({
  meta: {
    name: "codegen",
    description:
      "Generate a typed StreamboardState interface + push() helper for a streamboard.",
  },
  args: {
    id: {
      type: "positional",
      description: "Streamboard id (the `<id>` segment in /s/<id>).",
      required: true,
    },
    out: {
      type: "string",
      description: "Output file path (default: ./streamboard.generated.ts).",
      default: "./streamboard.generated.ts",
    },
    token: {
      type: "string",
      description:
        "Data token (sb_d_…). Defaults to STREAMBOARD_DATA_TOKEN or STREAMBOARD_TOKEN env var.",
    },
    "base-url": {
      type: "string",
      description:
        "API base URL. Defaults to STREAMBOARD_API_URL env var or https://usestreamboard.com.",
    },
    stdout: {
      type: "boolean",
      description: "Print to stdout instead of writing a file.",
      default: false,
    },
  },
  async run({ args }) {
    const token =
      args.token ??
      process.env.STREAMBOARD_DATA_TOKEN ??
      // STREAMBOARD_TOKEN holds the session OAuth bearer in the rest
      // of the CLI; fall back to it only if it parses as a data token.
      (process.env.STREAMBOARD_TOKEN?.startsWith(DATA_TOKEN_PREFIX)
        ? process.env.STREAMBOARD_TOKEN
        : undefined)
    if (!token) {
      throw new Error(
        "Missing data token. Pass --token sb_d_… or set STREAMBOARD_DATA_TOKEN.",
      )
    }
    if (!token.startsWith(DATA_TOKEN_PREFIX)) {
      throw new Error(
        `Invalid data token shape. Expected a token starting with \`${DATA_TOKEN_PREFIX}\`.`,
      )
    }

    const baseUrl = (
      args["base-url"] ??
      process.env.STREAMBOARD_API_URL ??
      DEFAULT_API_URL
    ).replace(/\/$/, "")

    const url = `${baseUrl}/api/data/v1/streamboards/${encodeURIComponent(args.id)}/schema`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => "")
      throw new Error(
        `Schema fetch failed: HTTP ${res.status} ${res.statusText}. ${errBody}`,
      )
    }
    const schema = (await res.json()) as SchemaResponse

    const ts = renderCodegen({
      streamboardId: schema.streamboardId,
      version: schema.version,
      baseUrl,
      fields: schema.fields,
    })

    if (args.stdout) {
      process.stdout.write(ts)
      return
    }
    const outPath = resolvePath(args.out)
    writeFileSync(outPath, ts, "utf-8")
    output(
      {
        ok: true,
        streamboardId: schema.streamboardId,
        version: schema.version,
        fields: schema.fields.length,
        out: outPath,
      },
      true,
    )
  },
})

// ─── Push (live data) ─────────────────────────────────────────────

/**
 * Resolve the data token from CLI args / env. Order:
 *   1. --token flag (explicit)
 *   2. STREAMBOARD_DATA_TOKEN env var (dedicated)
 *   3. STREAMBOARD_TOKEN env var, but only if it parses as `sb_d_…`
 *      (the same env var carries the session OAuth bearer elsewhere
 *      in the CLI — we don't want to send THAT to a bearer-auth
 *      surface).
 */
function resolveDataToken(flagToken: string | undefined): string {
  const raw =
    flagToken ??
    process.env.STREAMBOARD_DATA_TOKEN ??
    (process.env.STREAMBOARD_TOKEN?.startsWith(DATA_TOKEN_PREFIX)
      ? process.env.STREAMBOARD_TOKEN
      : undefined)
  if (!raw) {
    throw new Error(
      "Missing data token. Pass --token sb_d_… or set STREAMBOARD_DATA_TOKEN.",
    )
  }
  if (!raw.startsWith(DATA_TOKEN_PREFIX)) {
    throw new Error(
      `Invalid data token shape. Expected a token starting with \`${DATA_TOKEN_PREFIX}\`.`,
    )
  }
  return raw
}

function resolveDataBaseUrl(flag: string | undefined): string {
  return (flag ?? process.env.STREAMBOARD_API_URL ?? DEFAULT_API_URL).replace(
    /\/$/,
    "",
  )
}

const push = defineCommand({
  meta: {
    name: "push",
    description:
      "Push a state envelope to a streamboard (live data). JSON via --state or stdin.",
  },
  args: {
    id: {
      type: "positional",
      description: "Streamboard id (the `<id>` segment in /s/<id>).",
      required: true,
    },
    state: {
      type: "string",
      description: "State envelope as JSON. If omitted, reads JSON from stdin.",
    },
    token: {
      type: "string",
      description:
        "Data token (sb_d_…). Defaults to STREAMBOARD_DATA_TOKEN env var.",
    },
    "base-url": {
      type: "string",
      description:
        "API base URL. Defaults to STREAMBOARD_API_URL or https://usestreamboard.com.",
    },
    retries: {
      type: "string",
      description: "Max retries on 429 / 5xx. Default: 3. Pass 0 to disable.",
      default: "3",
    },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const token = resolveDataToken(args.token)
    const baseUrl = resolveDataBaseUrl(args["base-url"])

    // --state takes raw JSON; otherwise read + parse from stdin.
    // readStdin already JSON.parses and exits on bad input.
    const state: unknown =
      args.state !== undefined
        ? (() => {
            try {
              return JSON.parse(args.state)
            } catch (err) {
              throw new Error(
                `Invalid JSON in --state: ${err instanceof Error ? err.message : String(err)}`,
              )
            }
          })()
        : await readStdin<unknown>()

    if (!state || typeof state !== "object" || Array.isArray(state)) {
      throw new Error("State must be a JSON object.")
    }

    const board = new Streamboard({
      token,
      baseUrl,
      streamboardId: args.id,
      retries: Number(args.retries) || 0,
    })

    try {
      const result = await board.push(state as Record<string, unknown>)
      output(result, args.pretty)
    } catch (err) {
      if (err instanceof StreamboardError) {
        // Render a structured error for shell pipelines.
        process.stderr.write(
          JSON.stringify({
            ok: false,
            kind: err.kind,
            status: err.status,
            error: err.message,
          }) + "\n",
        )
        process.exit(1)
      }
      throw err
    }
  },
})

export const streamboardsCommand = defineCommand({
  meta: { name: "streamboards", description: "Manage streamboards" },
  subCommands: { ls, get, create, update, rm, versions, codegen, push },
})
