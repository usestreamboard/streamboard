import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { deleteConfig, loadConfig, resolveAuth, saveConfig } from "../config"

let tempDir: string

beforeEach(() => {
  tempDir = join(tmpdir(), `streamboard-test-${crypto.randomUUID()}`)
  mkdirSync(tempDir, { recursive: true })
  vi.stubEnv("XDG_CONFIG_HOME", tempDir)
  vi.unstubAllEnvs
})

afterEach(() => {
  vi.unstubAllEnvs()
  if (existsSync(tempDir)) rmSync(tempDir, { recursive: true })
})

describe("loadConfig", () => {
  test("returns null when no config exists", () => {
    expect(loadConfig()).toBeNull()
  })

  test("loads a valid config file", () => {
    const configDir = join(tempDir, "streamboard")
    mkdirSync(configDir, { recursive: true })
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({
        apiUrl: "https://example.com",
        token: "abc",
      }),
    )
    const config = loadConfig()
    expect(config).toEqual({
      apiUrl: "https://example.com",
      token: "abc",
    })
  })

  test("returns null for invalid JSON", () => {
    const configDir = join(tempDir, "streamboard")
    mkdirSync(configDir, { recursive: true })
    writeFileSync(join(configDir, "config.json"), "not json")
    expect(loadConfig()).toBeNull()
  })
})

describe("saveConfig", () => {
  test("creates config dir and writes file", () => {
    saveConfig({
      apiUrl: "https://usestreamboard.com",
      token: "tok123",
    })
    const config = loadConfig()
    expect(config).toEqual({
      apiUrl: "https://usestreamboard.com",
      token: "tok123",
    })
  })
})

describe("deleteConfig", () => {
  test("deletes existing config file", () => {
    saveConfig({
      apiUrl: "https://usestreamboard.com",
      token: "tok",
    })
    expect(loadConfig()).not.toBeNull()
    deleteConfig()
    expect(loadConfig()).toBeNull()
  })

  test("does nothing when no config exists", () => {
    expect(() => deleteConfig()).not.toThrow()
  })
})

describe("resolveAuth", () => {
  test("returns null when no env vars or config", () => {
    expect(resolveAuth()).toBeNull()
  })

  test("prefers STREAMBOARD_TOKEN env var over config file", () => {
    saveConfig({
      apiUrl: "https://from-config.dev",
      token: "config-token",
    })
    vi.stubEnv("STREAMBOARD_TOKEN", "env-token")

    const auth = resolveAuth()
    expect(auth).toEqual({
      apiUrl: "https://usestreamboard.com",
      token: "env-token",
    })
  })

  test("uses STREAMBOARD_API_URL with env token", () => {
    vi.stubEnv("STREAMBOARD_TOKEN", "env-token")
    vi.stubEnv("STREAMBOARD_API_URL", "https://custom.dev")

    const auth = resolveAuth()
    expect(auth).toEqual({ apiUrl: "https://custom.dev", token: "env-token" })
  })

  test("falls back to config file", () => {
    saveConfig({
      apiUrl: "https://saved.dev",
      token: "saved-token",
    })

    const auth = resolveAuth()
    expect(auth).toEqual({ apiUrl: "https://saved.dev", token: "saved-token" })
  })

  test("STREAMBOARD_API_URL overrides config apiUrl", () => {
    saveConfig({
      apiUrl: "https://saved.dev",
      token: "saved-token",
    })
    vi.stubEnv("STREAMBOARD_API_URL", "https://override.dev")

    const auth = resolveAuth()
    expect(auth).toEqual({
      apiUrl: "https://override.dev",
      token: "saved-token",
    })
  })
})
