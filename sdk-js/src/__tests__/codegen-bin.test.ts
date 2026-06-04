import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { main } from "../codegen-bin"

/** Spy on a stream's `write`, routing each chunk into `sink`. */
function spyWrite(
  stream: NodeJS.WriteStream,
  sink: (chunk: string) => void,
) {
  return vi.spyOn(stream, "write").mockImplementation((chunk) => {
    sink(String(chunk))
    return true
  })
}

const TOKEN = "sb_d_abcdefgh_ZZZZZZZZZZZZZZZZ"

const SCHEMA_BODY = {
  streamboardId: "abcdefgh",
  version: "1.2.0",
  fields: [
    {
      path: "kpis.mrr.value",
      componentType: "KPI",
      propName: "value",
      tsType: "string",
      jsonSchema: { type: "string" },
    },
  ],
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

describe("codegen-bin main", () => {
  let stdout: string
  let stderr: string
  let writeSpy: ReturnType<typeof spyWrite>
  let errSpy: ReturnType<typeof spyWrite>

  beforeEach(() => {
    stdout = ""
    stderr = ""
    writeSpy = spyWrite(process.stdout, (c) => {
      stdout += c
    })
    errSpy = spyWrite(process.stderr, (c) => {
      stderr += c
    })
  })

  afterEach(() => {
    writeSpy.mockRestore()
    errSpy.mockRestore()
    vi.unstubAllGlobals()
    delete process.env.STREAMBOARD_TOKEN
  })

  test("fetches the schema and prints generated TS to stdout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(SCHEMA_BODY)))

    const code = await main(["--token", TOKEN, "--stdout"])

    expect(code).toBe(0)
    expect(stdout).toContain("export interface StreamboardState {")
    expect(stdout).toContain("value: string")
    expect(stdout).toContain('from "@streamboard/sdk"')
  })

  test("reads the token from STREAMBOARD_TOKEN when --token is omitted", async () => {
    process.env.STREAMBOARD_TOKEN = TOKEN
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(SCHEMA_BODY)))

    const code = await main(["--stdout"])

    expect(code).toBe(0)
    expect(stdout).toContain("export interface StreamboardState {")
  })

  test("exits 2 with usage when no token is available", async () => {
    const code = await main([])
    expect(code).toBe(2)
    expect(stderr).toContain("STREAMBOARD_TOKEN is required")
  })

  test("exits 2 on a malformed token", async () => {
    const code = await main(["--token", "garbage"])
    expect(code).toBe(2)
    expect(stderr).toContain("error:")
  })

  test("--help prints usage and exits 0", async () => {
    const code = await main(["--help"])
    expect(code).toBe(0)
    expect(stdout).toContain("Usage:")
  })
})
