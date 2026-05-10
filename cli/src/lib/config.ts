import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export interface CliConfig {
  apiUrl: string
  token: string
}

export const DEFAULT_API_URL = "https://memcard.dev"

function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  return join(xdg || join(homedir(), ".config"), "memcard")
}

function getConfigPath(): string {
  return join(getConfigDir(), "config.json")
}

export function loadConfig(): CliConfig | null {
  const path = getConfigPath()
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as CliConfig
  } catch {
    return null
  }
}

export function saveConfig(config: CliConfig): void {
  const dir = getConfigDir()
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  })
}

export function deleteConfig(): void {
  const path = getConfigPath()
  if (existsSync(path)) rmSync(path)
}

/**
 * Resolves the API URL and auth token from env vars or config file.
 * Env vars take precedence: MEMCARD_TOKEN, MEMCARD_API_URL.
 */
export function resolveAuth(): { apiUrl: string; token: string } | null {
  const envToken = process.env.MEMCARD_TOKEN
  const envUrl = process.env.MEMCARD_API_URL

  if (envToken) {
    return { apiUrl: envUrl || DEFAULT_API_URL, token: envToken }
  }

  const config = loadConfig()
  if (config) {
    return { apiUrl: envUrl || config.apiUrl, token: config.token }
  }

  return null
}
