import { readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { runCapture } from "./capture"

const counterFile = join(tmpdir(), `.streamboard-test-counter-${process.pid}`)

beforeEach(() => {
  process.env.STREAMBOARD_COUNTER_FILE = counterFile
  try {
    unlinkSync(counterFile)
  } catch {
    // ignore
  }
})

afterEach(() => {
  delete process.env.STREAMBOARD_COUNTER_FILE
  try {
    unlinkSync(counterFile)
  } catch {
    // ignore
  }
})

describe("capture", () => {
  test("counter increments and writes to file", async () => {
    await runCapture(10)
    expect(readFileSync(counterFile, "utf-8")).toBe("1")

    await runCapture(10)
    expect(readFileSync(counterFile, "utf-8")).toBe("2")
  })

  test("no stdout on non-trigger stops", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    await runCapture(10)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test("feedback JSON emitted on every Nth stop", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})

    for (let i = 0; i < 10; i++) {
      await runCapture(10)
    }

    expect(spy).toHaveBeenCalledTimes(1)
    const output = JSON.parse(spy.mock.calls[0][0])
    expect(output).toHaveProperty("feedback")
    expect(output.feedback).toContain("flashcards")
    spy.mockRestore()
  })

  test("custom --every value works", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})

    for (let i = 0; i < 3; i++) {
      await runCapture(3)
    }

    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  test("corrupt counter file defaults to 0", async () => {
    writeFileSync(counterFile, "not-a-number", "utf-8")
    await runCapture(10)
    expect(readFileSync(counterFile, "utf-8")).toBe("1")
  })

  test("missing counter file defaults to 0", async () => {
    await runCapture(10)
    expect(readFileSync(counterFile, "utf-8")).toBe("1")
  })

  test("counter persists across calls", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})

    for (let i = 0; i < 5; i++) {
      await runCapture(5)
    }
    expect(spy).toHaveBeenCalledTimes(1)
    expect(readFileSync(counterFile, "utf-8")).toBe("5")

    for (let i = 0; i < 5; i++) {
      await runCapture(5)
    }
    expect(spy).toHaveBeenCalledTimes(2)
    expect(readFileSync(counterFile, "utf-8")).toBe("10")

    spy.mockRestore()
  })
})
