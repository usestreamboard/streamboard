#!/usr/bin/env node
/**
 * `streamboard-codegen` — fetch a board's schema and emit a typed
 * `StreamboardState` module. Mirrors the Python `streamboard-codegen`
 * console script so both SDKs ship codegen in-package.
 *
 *     streamboard-codegen <board-id> --token sb_d_… -o streamboard.generated.ts
 *     STREAMBOARD_TOKEN=sb_d_… streamboard-codegen <board-id> --stdout
 *
 * The board id is a required argument — the `<id>` segment from
 * `/s/<id>`. The data token only carries the token's own id, not the
 * board id, so it can't be derived from the bearer.
 *
 * Zero dependencies: a tiny hand-rolled flag parser, the SDK's own
 * `schema()`, and `node:fs` for the optional file write.
 */

import { writeFileSync } from "node:fs"
import { generate } from "./codegen"
import { Streamboard, StreamboardError } from "./index"

interface Args {
  token?: string
  id?: string
  baseUrl?: string
  out?: string
  stdout: boolean
  help: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = { stdout: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i]
    switch (arg) {
      case "--token":
        args.token = next()
        break
      case "--id":
        args.id = next()
        break
      case "--base-url":
        args.baseUrl = next()
        break
      case "-o":
      case "--out":
        args.out = next()
        break
      case "--stdout":
        args.stdout = true
        break
      case "-h":
      case "--help":
        args.help = true
        break
      default:
        // Support `--flag=value` form too.
        if (arg.startsWith("--") && arg.includes("=")) {
          const [flag, ...rest] = arg.split("=")
          const value = rest.join("=")
          if (flag === "--token") args.token = value
          else if (flag === "--id") args.id = value
          else if (flag === "--base-url") args.baseUrl = value
          else if (flag === "--out") args.out = value
        } else if (!arg.startsWith("-") && args.id === undefined) {
          // First bare argument is the board id (the `<id>` in /s/<id>).
          args.id = arg
        }
        break
    }
  }
  return args
}

const USAGE = `streamboard-codegen — generate a typed StreamboardState module.

Usage:
  streamboard-codegen <board-id> --token sb_d_<id>_<secret> [-o FILE]

Arguments:
  <board-id>       The board id — the \`<id>\` segment in /s/<id>. Required.
                   (The token only carries the token's own id, not the
                   board id, so it can't be derived from the bearer.)

Options:
  --token <t>      Data token (sb_d_…). Defaults to env STREAMBOARD_TOKEN.
  --id <id>        Board id, as an alternative to the positional argument.
  --base-url <u>   API base URL. Default: https://usestreamboard.com
  -o, --out <f>    Output file. Default: stdout.
  --stdout         Force output to stdout.
  -h, --help       Show this help.
`

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv)
  if (args.help) {
    process.stdout.write(USAGE)
    return 0
  }

  const token = args.token ?? process.env.STREAMBOARD_TOKEN
  if (!token) {
    process.stderr.write("error: --token or STREAMBOARD_TOKEN is required\n\n")
    process.stderr.write(USAGE)
    return 2
  }

  if (!args.id) {
    process.stderr.write(
      "error: a board id is required (the <id> in /s/<id>) — pass it as the\n" +
        "first argument or via --id. It can't be derived from the token.\n\n",
    )
    process.stderr.write(USAGE)
    return 2
  }

  let board: Streamboard
  try {
    board = new Streamboard({
      token,
      streamboardId: args.id,
      baseUrl: args.baseUrl,
    })
  } catch (err) {
    const message = err instanceof StreamboardError ? err.message : String(err)
    process.stderr.write(`error: ${message}\n`)
    return 2
  }

  let code: string
  try {
    const doc = await board.schema()
    code = generate(doc, { baseUrl: args.baseUrl })
  } catch (err) {
    const message = err instanceof StreamboardError ? err.message : String(err)
    process.stderr.write(`error: schema fetch failed — ${message}\n`)
    return 1
  }

  if (args.out && !args.stdout) {
    writeFileSync(args.out, code, "utf-8")
    process.stderr.write(`wrote ${args.out}\n`)
  } else {
    process.stdout.write(code)
  }
  return 0
}

// Run when invoked as a script (not when imported by tests).
if (process.argv[1]?.includes("codegen-bin")) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`)
      process.exit(1)
    },
  )
}
