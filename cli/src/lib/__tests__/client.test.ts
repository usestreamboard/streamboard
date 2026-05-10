import { ORPCError } from "@orpc/client"
import { afterEach, describe, expect, test, vi } from "vitest"
import { rpc } from "../auth"

const mockExit = vi
  .spyOn(process, "exit")
  .mockImplementation(() => undefined as never)
const mockStderr = vi.spyOn(console, "error").mockImplementation(() => {})

afterEach(() => {
  mockExit.mockClear()
  mockStderr.mockClear()
})

describe("rpc error handler", () => {
  test("returns result on success", async () => {
    const result = await rpc(() => Promise.resolve({ decks: [] }))
    expect(result).toEqual({ decks: [] })
  })

  test("handles UNAUTHORIZED with session expired message", async () => {
    await rpc(() =>
      Promise.reject(
        new ORPCError("UNAUTHORIZED", { message: "Unauthorized" }),
      ),
    ).catch(() => {})

    expect(mockStderr).toHaveBeenNthCalledWith(
      1,
      '{"error":"Session expired. Run: memcard login","code":"SESSION_EXPIRED"}',
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  test("handles other oRPC errors with error message and code", async () => {
    await rpc(() =>
      Promise.reject(new ORPCError("NOT_FOUND", { message: "Deck not found" })),
    ).catch(() => {})

    expect(mockStderr).toHaveBeenNthCalledWith(
      1,
      '{"error":"Deck not found","code":"RPC_ERROR"}',
    )
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  test("rethrows non-oRPC errors", async () => {
    const err = new Error("Network failure")
    await expect(rpc(() => Promise.reject(err))).rejects.toThrow(
      "Network failure",
    )
  })
})
