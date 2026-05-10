import { afterEach, describe, expect, test, vi } from "vitest"
import { output, outputError } from "../output"

describe("output", () => {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

  afterEach(() => {
    logSpy.mockClear()
  })

  test("writes compact JSON by default", () => {
    output({ decks: [{ id: "1", title: "Test" }] })
    expect(logSpy).toHaveBeenCalledWith('{"decks":[{"id":"1","title":"Test"}]}')
  })

  test("writes indented JSON with pretty flag", () => {
    output({ ok: true }, true)
    const result = logSpy.mock.calls[0][0] as string
    expect(result).toContain("\n")
    expect(JSON.parse(result)).toEqual({ ok: true })
  })

  test("handles null and primitive values", () => {
    output(null)
    expect(logSpy).toHaveBeenCalledWith("null")

    logSpy.mockClear()
    output(42)
    expect(logSpy).toHaveBeenCalledWith("42")
  })
})

describe("outputError", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  const exitSpy = vi
    .spyOn(process, "exit")
    .mockImplementation(() => undefined as never)

  afterEach(() => {
    errorSpy.mockClear()
    exitSpy.mockClear()
  })

  test("writes error JSON to stderr and exits with code 1", () => {
    outputError("Deck not found")
    expect(errorSpy).toHaveBeenCalledWith('{"error":"Deck not found"}')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  test("includes error code when provided", () => {
    outputError("Not logged in", { code: "NOT_AUTHENTICATED" })
    expect(errorSpy).toHaveBeenCalledWith(
      '{"error":"Not logged in","code":"NOT_AUTHENTICATED"}',
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  test("supports custom exit codes", () => {
    outputError("Fatal", { exitCode: 2 })
    expect(exitSpy).toHaveBeenCalledWith(2)
  })
})
