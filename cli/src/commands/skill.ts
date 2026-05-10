import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineCommand } from "citty"
import { output, outputError } from "../lib/output"

/**
 * Resolve the bundled skills directory shipped with the npm package.
 * In dev (tsx): resolves relative to src/commands/ → ../../skills
 * In prod (dist/index.mjs): resolves relative to dist/ → ../skills
 */
function resolveSkillsDir(): string {
  const thisDir = dirname(fileURLToPath(import.meta.url))
  const prodPath = resolve(thisDir, "../skills")
  if (existsSync(prodPath)) return prodPath
  const devPath = resolve(thisDir, "../../skills")
  if (existsSync(devPath)) return devPath
  return prodPath
}

/**
 * Copy skill files from source to target directory, preserving subdirectory structure.
 * Returns list of created file paths (relative to target).
 */
function copySkillFiles(srcDir: string, destDir: string): string[] | null {
  if (!existsSync(srcDir)) {
    outputError(
      `Skills directory not found: ${srcDir}. Try reinstalling the memcard package.`,
    )
    return null
  }

  const created: string[] = []
  const entries = readdirSync(srcDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const skillFile = join(srcDir, entry.name, "SKILL.md")
    if (!existsSync(skillFile)) continue

    const destSubdir = join(destDir, entry.name)
    mkdirSync(destSubdir, { recursive: true })

    const content = readFileSync(skillFile, "utf-8")
    const destFile = join(destSubdir, "SKILL.md")
    writeFileSync(destFile, content, "utf-8")
    created.push(`${entry.name}/SKILL.md`)
  }

  return created
}

const installCommand = defineCommand({
  meta: {
    name: "install",
    description:
      "Install memcard skills to .agents/skills/ (agentskills.io convention)",
  },
  args: {
    dir: {
      type: "string",
      description: "Custom target directory for skill files",
    },
    global: {
      type: "boolean",
      description: "Install to ~/.agents/skills/memcard/ (user-level)",
      default: false,
    },
    pretty: {
      type: "boolean",
      description: "Human-readable output",
      default: false,
    },
  },
  run({ args }) {
    let targetDir: string
    if (args.dir) {
      targetDir = resolve(args.dir)
    } else if (args.global) {
      targetDir = resolve(homedir(), ".agents", "skills", "memcard")
    } else {
      targetDir = resolve(process.cwd(), ".agents", "skills", "memcard")
    }

    const srcDir = resolveSkillsDir()
    const created = copySkillFiles(srcDir, targetDir)

    if (!created || created.length === 0) {
      return outputError("No skill files found to install.")
    }

    output({ created, directory: targetDir }, args.pretty)
  },
})

export const skillCommand = defineCommand({
  meta: {
    name: "skill",
    description: "Manage memcard agent skills (agentskills.io)",
  },
  subCommands: {
    install: installCommand,
  },
})
