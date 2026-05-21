import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { Contract } from "./api-contract"

export type StreamboardClient = Contract

export function createClient(apiUrl: string, token: string): StreamboardClient {
  const link = new RPCLink({
    url: `${apiUrl}/api/rpc`,
    headers: () => ({
      Authorization: `Bearer ${token}`,
    }),
  })
  return createORPCClient<StreamboardClient>(link)
}
