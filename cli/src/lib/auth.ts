import { ORPCError } from "@orpc/client"
import type { MemcardClient } from "./client"
import { createClient } from "./client"
import { resolveAuth } from "./config"
import { outputError } from "./output"

/** Resolve auth and return a ready-to-use client. Exits if not authenticated. */
export function requireClient(): MemcardClient {
  const auth = resolveAuth()
  if (!auth) {
    outputError("Not logged in. Run: memcard login", {
      code: "NOT_AUTHENTICATED",
    })
  }
  return createClient(auth.apiUrl, auth.token)
}

/** Run an async oRPC call with standardized error handling. */
export async function rpc<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof ORPCError) {
      if (err.code === "UNAUTHORIZED") {
        outputError("Session expired. Run: memcard login", {
          code: "SESSION_EXPIRED",
        })
      }
      outputError(err.message, { code: "RPC_ERROR" })
    }
    throw err
  }
}
