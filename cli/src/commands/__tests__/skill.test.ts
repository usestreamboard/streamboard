import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { resolve } from "node:path"
import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
const exitSpy = vi
  .spyOn(process, "exit")
  .mockImplementation(() => undefined as never)

afterEach(() => {
  logSpy.mockClear()
  errorSpy.mockClear()
  exitSpy.mockClear()
  vi.mocked(existsSync).mockReset()
  vi.mocked(mkdirSync).mockReset()
  vi.mocked(readdirSync).mockReset()
  vi.mocked(readFileSync).mockReset()
  vi.mocked(writeFileSync).mockReset()
})

async function runSkill(args: string[]) {
  const { skillCommand } = await import("../skill")
  const { runCommand: run } = await import("citty")
  await run(skillCommand, { rawArgs: args })
}

describe("skill install", () => {
  function mockSkillsDir(skills: string[]) {
    vi.mocked(existsSync).mockImplementation((p) => {
      const path = String(p)
      if (path.includes("skills") && !path.includes("SKILL.md")) return true
      if (path.endsWith("SKILL.md")) return true
      return false
    })

    vi.mocked(readdirSync).mockReturnValue(
      skills.map((name) => ({
        name,
        isDirectory: () => true,
        isFile: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        isSymbolicLink: () => false,
        parentPath: "",
        path: "",
      })) as unknown as ReturnType<typeof readdirSync>,
    )

    vi.mocked(readFileSync).mockReturnValue("---\nname: test\n---\n# Test")
  }

  test("copies skill files to project-level .agents/skills/ by default", async () => {
    mockSkillsDir(["create-deck", "review"])

    await runSkill(["install"])

    expect(mkdirSync).toHaveBeenCalledTimes(2)
    expect(writeFileSync).toHaveBeenCalledTimes(2)

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(logged.created).toEqual(["create-deck/SKILL.md", "review/SKILL.md"])
    expect(logged.directory).toBe(
      resolve(process.cwd(), ".agents", "skills", "streamboard"),
    )
  })

  test("copies to user-level ~/.agents/skills/ with --global", async () => {
    mockSkillsDir(["create-deck"])

    await runSkill(["install", "--global"])

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(logged.directory).toBe(
      resolve(homedir(), ".agents", "skills", "streamboard"),
    )
  })

  test("copies to custom --dir path", async () => {
    mockSkillsDir(["create-deck"])

    await runSkill(["install", "--dir", "/tmp/my-skills"])

    const logged = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(logged.directory).toBe("/tmp/my-skills")
  })

  test("errors when source skills directory not found", async () => {
    vi.mocked(existsSync).mockReturnValue(false)

    await runSkill(["install"])

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Skills directory not found"),
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  test("errors when no skill files found", async () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readdirSync).mockReturnValue([])

    await runSkill(["install"])

    expect(errorSpy).toHaveBeenCalledWith(
      '{"error":"No skill files found to install."}',
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
