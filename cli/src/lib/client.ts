import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { AppRouter, RouterClient } from "@streamboard/api/orpc"

export type MemcardClient = RouterClient<AppRouter>

export function createClient(apiUrl: string, token: string): MemcardClient {
  const link = new RPCLink({
    url: `${apiUrl}/api/rpc`,
    headers: () => ({
      Authorization: `Bearer ${token}`,
    }),
  })
  return createORPCClient<MemcardClient>(link)
}
