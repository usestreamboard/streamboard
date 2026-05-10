import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("../../lib/config", () => ({
  DEFAULT_API_URL: "https://usestreamboard.com",
  saveConfig: vi.fn(),
  resolveAuth: vi.fn(),
}))

const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
const exitSpy = vi
  .spyOn(process, "exit")
  .mockImplementation(() => undefined as never)

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

import { resolveAuth, saveConfig } from "../../lib/config"

afterEach(() => {
  logSpy.mockClear()
  errorSpy.mockClear()
  exitSpy.mockClear()
  mockFetch.mockReset()
  vi.mocked(saveConfig).mockClear()
  vi.mocked(resolveAuth).mockReset()
})

async function runCommand(args: string[]) {
  vi.resetModules()
  // Re-import to get fresh command definitions after module reset
  const { authCommand } = await import("../auth-flow")
  const { runCommand: run } = await import("citty")
  await run(authCommand, { rawArgs: args })
}

describe("auth request", () => {
  const deviceCodeResponse = {
    device_code: "dev_abc123",
    user_code: "ABCD-1234",
    verification_uri: "https://usestreamboard.com/device",
    verification_uri_complete:
      "https://usestreamboard.com/device?code=ABCD-1234",
    expires_in: 900,
    interval: 5,
  }

  test("outputs device code response on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(deviceCodeResponse),
    })

    await runCommand(["request"])

    expect(mockFetch).toHaveBeenCalledWith(
      "https://usestreamboard.com/api/auth/device/code",
      expect.objectContaining({ method: "POST" }),
    )
    const logged = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(logged.device_code).toBe("dev_abc123")
    expect(logged.user_code).toBe("ABCD-1234")
    expect(logged.verification_uri_complete).toBe(
      "https://usestreamboard.com/device?code=ABCD-1234",
    )
    expect(logged.api_url).toBe("https://usestreamboard.com")
  })

  test("outputs error when API fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({ error_description: "Client not registered" }),
    })

    await runCommand(["request"])

    const logged = JSON.parse(errorSpy.mock.calls[0][0] as string)
    expect(logged.error).toBe("Client not registered")
    expect(logged.code).toBe("DEVICE_AUTH_FAILED")
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  test("outputs fallback error when API returns no description", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.reject(new Error("bad json")),
    })

    await runCommand(["request"])

    const logged = JSON.parse(errorSpy.mock.calls[0][0] as string)
    expect(logged.error).toBe("Failed to initiate device auth")
    expect(logged.code).toBe("DEVICE_AUTH_FAILED")
  })
})

describe("auth poll", () => {
  test("saves config and outputs complete on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "tok_xyz",
          token_type: "bearer",
          expires_in: 3600,
          scope: "",
        }),
    })

    await runCommand(["poll", "dev_abc123"])

    expect(mockFetch).toHaveBeenCalledWith(
      "https://usestreamboard.com/api/auth/device/token",
      expect.objectContaining({ method: "POST" }),
    )
    expect(saveConfig).toHaveBeenCalledWith({
      apiUrl: "https://usestreamboard.com",
      token: "tok_xyz",
    })
    const logged = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(logged.status).toBe("complete")
  })

  test("outputs pending for authorization_pending", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "authorization_pending",
          error_description: "User has not yet authorized",
        }),
    })

    await runCommand(["poll", "dev_abc123"])

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(logged.status).toBe("pending")
    expect(exitSpy).not.toHaveBeenCalled()
  })

  test("outputs pending with retry_after for slow_down", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "slow_down",
          error_description: "Slow down",
        }),
    })

    await runCommand(["poll", "dev_abc123"])

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(logged.status).toBe("pending")
    expect(logged.retry_after).toBe(true)
  })

  test("outputs error with code for expired_token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "expired_token",
          error_description: "Token expired",
        }),
    })

    await runCommand(["poll", "dev_abc123"])

    const logged = JSON.parse(errorSpy.mock.calls[0][0] as string)
    expect(logged.error).toBe("Device code expired. Please try again.")
    expect(logged.code).toBe("DEVICE_CODE_EXPIRED")
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  test("outputs error with code for access_denied", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "access_denied",
          error_description: "Denied",
        }),
    })

    await runCommand(["poll", "dev_abc123"])

    const logged = JSON.parse(errorSpy.mock.calls[0][0] as string)
    expect(logged.error).toBe("Authorization denied.")
    expect(logged.code).toBe("ACCESS_DENIED")
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  test("outputs error description for unknown errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "server_error",
          error_description: "Internal server error",
        }),
    })

    await runCommand(["poll", "dev_abc123"])

    const logged = JSON.parse(errorSpy.mock.calls[0][0] as string)
    expect(logged.error).toBe("Internal server error")
    expect(logged.code).toBe("DEVICE_AUTH_FAILED")
  })
})

describe("auth status", () => {
  test("returns authenticated false when no credentials", async () => {
    vi.mocked(resolveAuth).mockReturnValue(null)

    await runCommand(["status"])

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(logged.authenticated).toBe(false)
    expect(logged.api_url).toBeNull()
    expect(logged.source).toBeNull()
  })

  test("returns authenticated true with config source", async () => {
    vi.mocked(resolveAuth).mockReturnValue({
      apiUrl: "https://usestreamboard.com",
      token: "tok_abc",
    })

    await runCommand(["status"])

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(logged.authenticated).toBe(true)
    expect(logged.api_url).toBe("https://usestreamboard.com")
    expect(logged.source).toBe("config")
  })

  test("returns env source when STREAMBOARD_TOKEN is set", async () => {
    process.env.STREAMBOARD_TOKEN = "tok_env"
    vi.mocked(resolveAuth).mockReturnValue({
      apiUrl: "https://usestreamboard.com",
      token: "tok_env",
    })

    await runCommand(["status"])

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(logged.authenticated).toBe(true)
    expect(logged.source).toBe("env")

    delete process.env.STREAMBOARD_TOKEN
  })
})
