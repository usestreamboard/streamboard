import { defineCommand } from "citty"
import {
  DEFAULT_API_URL,
  deleteConfig,
  resolveAuth,
  saveConfig,
} from "../lib/config"
import { output, outputError } from "../lib/output"

const CLIENT_ID = "streamboard-cli"
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const loginCommand = defineCommand({
  meta: {
    name: "login",
    description: "Authenticate with streamboard via device flow",
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

    const codeRes = await fetch(`${apiUrl}/api/auth/device/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID }),
    })

    if (!codeRes.ok) {
      const body = await codeRes.json().catch(() => ({}))
      const msg =
        (body as Record<string, unknown>).error_description ||
        "Failed to initiate device auth"
      return outputError(String(msg), { code: "DEVICE_AUTH_FAILED" })
    }

    const codeData = (await codeRes.json()) as DeviceCodeResponse
    const isInteractive = process.stdout.isTTY

    if (isInteractive) {
      const { spinner, note } = await import("@clack/prompts")
      note(
        `Open this URL in your browser:\n  ${codeData.verification_uri_complete}\n\nOr visit ${codeData.verification_uri} and enter code:\n  ${codeData.user_code}`,
        "Device Authorization",
      )

      const s = spinner()
      s.start("Waiting for authorization...")

      const token = await pollForToken(apiUrl, codeData)
      s.stop("Authorized!")

      saveConfig({ apiUrl, token })
      output({ success: true, message: "Logged in" })
    } else {
      console.error(
        `Visit ${codeData.verification_uri} and enter code: ${codeData.user_code}`,
      )

      const token = await pollForToken(apiUrl, codeData)
      saveConfig({ apiUrl, token })
      output({ success: true, message: "Logged in" })
    }
  },
})

async function pollForToken(
  apiUrl: string,
  codeData: DeviceCodeResponse,
): Promise<string> {
  let interval = codeData.interval * 1000
  const deadline = Date.now() + codeData.expires_in * 1000

  while (Date.now() < deadline) {
    await sleep(interval)

    const res = await fetch(`${apiUrl}/api/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: GRANT_TYPE,
        device_code: codeData.device_code,
        client_id: CLIENT_ID,
      }),
    })

    if (res.ok) {
      const data = (await res.json()) as DeviceTokenResponse
      return data.access_token
    }

    const errBody = (await res.json().catch(() => ({}))) as DeviceTokenError
    const errCode = errBody.error

    if (errCode === "authorization_pending") {
      continue
    }
    if (errCode === "slow_down") {
      interval += 5000
      continue
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
  }

  return outputError("Device code expired. Please try again.", {
    code: "DEVICE_CODE_EXPIRED",
  })
}

export const logoutCommand = defineCommand({
  meta: { name: "logout", description: "Clear stored credentials" },
  run() {
    deleteConfig()
    output({ success: true })
  },
})

export const whoamiCommand = defineCommand({
  meta: { name: "whoami", description: "Show current user" },
  args: {
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  async run({ args }) {
    const auth = resolveAuth()
    if (!auth)
      return outputError("Not logged in. Run: streamboard login", {
        code: "NOT_AUTHENTICATED",
      })

    const res = await fetch(`${auth.apiUrl}/api/auth/get-session`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })

    if (!res.ok)
      return outputError("Session expired. Run: streamboard login", {
        code: "SESSION_EXPIRED",
      })

    const data = await res.json()
    output(data, args.pretty)
  },
})
