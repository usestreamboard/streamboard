import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { AppRouter, RouterClient } from "@streamboard/api-types"

export type StreamboardClient = RouterClient<AppRouter>

export function createClient(apiUrl: string, token: string): StreamboardClient {
  const link = new RPCLink({
    url: `${apiUrl}/api/rpc`,
    headers: () => ({
      Authorization: `Bearer ${token}`,
    }),
  })
  return createORPCClient<StreamboardClient>(link)
}
