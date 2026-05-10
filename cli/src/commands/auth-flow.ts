import { defineCommand } from "citty"
import { DEFAULT_API_URL, resolveAuth, saveConfig } from "../lib/config"
import { output, outputError } from "../lib/output"

const CLIENT_ID = "memcard-cli"
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code" as const

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}

interface DeviceTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface DeviceTokenError {
  error: string
  error_description: string
}

const requestCommand = defineCommand({
  meta: {
    name: "request",
    description: "Request a device authorization code (non-blocking)",
  },
  args: {
    "api-url": {
      type: "string",
      description: "API base URL",
      default: DEFAULT_API_URL,
    },
  },
  async run({ args }) {
    const apiUrl = args["api-url"]

    const res = await fetch(`${apiUrl}/api/auth/device/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const msg =
        (body as Record<string, unknown>).error_description ||
        "Failed to initiate device auth"
      return outputError(String(msg), { code: "DEVICE_AUTH_FAILED" })
    }

    const data = (await res.json()) as DeviceCodeResponse
    output({ ...data, api_url: apiUrl })
  },
})

const pollCommand = defineCommand({
  meta: {
    name: "poll",
    description: "Poll once for device authorization completion (non-blocking)",
  },
  args: {
    device_code: {
      type: "positional",
      description: "Device code from auth request",
      required: true,
    },
    "api-url": {
      type: "string",
      description: "API base URL",
      default: DEFAULT_API_URL,
    },
  },
  async run({ args }) {
    const apiUrl = args["api-url"]
    const deviceCode = args.device_code

    const res = await fetch(`${apiUrl}/api/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: GRANT_TYPE,
        device_code: deviceCode,
        client_id: CLIENT_ID,
      }),
    })

    if (res.ok) {
      const data = (await res.json()) as DeviceTokenResponse
      saveConfig({ apiUrl, token: data.access_token })
      output({ status: "complete" })
      return
    }

    const errBody = (await res.json().catch(() => ({}))) as DeviceTokenError
    const errCode = errBody.error

    if (errCode === "authorization_pending") {
      output({ status: "pending" })
      return
    }
    if (errCode === "slow_down") {
      output({ status: "pending", retry_after: true })
      return
    }

    if (errCode === "expired_token") {
      return outputError("Device code expired. Please try again.", {
        code: "DEVICE_CODE_EXPIRED",
      })
    }

    if (errCode === "access_denied") {
      return outputError("Authorization denied.", { code: "ACCESS_DENIED" })
    }

    return outputError(
      errBody.error_description || `Device auth failed: ${errCode}`,
      { code: "DEVICE_AUTH_FAILED" },
    )
  },
})

const statusCommand = defineCommand({
  meta: {
    name: "status",
    description: "Check if credentials are stored (no network call)",
  },
  run() {
    const auth = resolveAuth()
    output({
      authenticated: !!auth,
      api_url: auth?.apiUrl ?? null,
      source: process.env.MEMCARD_TOKEN ? "env" : auth ? "config" : null,
    })
  },
})

export const authCommand = defineCommand({
  meta: {
    name: "auth",
    description: "Non-blocking device flow authentication for agents",
  },
  subCommands: {
    request: requestCommand,
    poll: pollCommand,
    status: statusCommand,
  },
})
