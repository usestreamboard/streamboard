import { Readable } from "node:stream"
import { afterEach, describe, expect, test, vi } from "vitest"
import { readStdin } from "../stdin"

const mockExit = vi
  .spyOn(process, "exit")
  .mockImplementation(() => undefined as never)
const mockStderr = vi.spyOn(console, "error").mockImplementation(() => {})

afterEach(() => {
  mockExit.mockClear()
  mockStderr.mockClear()
})

function mockStdin(data: string) {
  const readable = Readable.from([Buffer.from(data)])
  Object.defineProperty(process, "stdin", {
    value: Object.assign(readable, { isTTY: false }),
    writable: true,
    configurable: true,
  })
}

describe("readStdin", () => {
  test("parses valid JSON from stdin", async () => {
    mockStdin('[{"front":"Q","back":"A"}]')
    const result = await readStdin<Array<{ front: string; back: string }>>()
    expect(result).toEqual([{ front: "Q", back: "A" }])
  })

  test("trims whitespace before parsing", async () => {
    mockStdin('  {"ok":true}  \n')
    const result = await readStdin<{ ok: boolean }>()
    expect(result).toEqual({ ok: true })
  })

  test("exits on TTY stdin", async () => {
    Object.defineProperty(process, "stdin", {
      value: Object.assign(Readable.from([]), { isTTY: true }),
      writable: true,
      configurable: true,
    })

    await readStdin().catch(() => {})
    expect(mockStderr).toHaveBeenCalledWith(
      expect.stringContaining("Expected JSON input on stdin"),
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  test("exits on empty stdin", async () => {
    mockStdin("")
    await readStdin().catch(() => {})
    expect(mockStderr).toHaveBeenCalledWith('{"error":"Empty stdin"}')
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  test("exits on invalid JSON", async () => {
    mockStdin("not json at all")
    await readStdin().catch(() => {})
    expect(mockStderr).toHaveBeenCalledWith('{"error":"Invalid JSON on stdin"}')
    expect(mockExit).toHaveBeenCalledWith(1)
  })
})
