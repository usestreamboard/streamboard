import { readFileSync, writeFileSync } from "node:fs"
import { defineCommand } from "citty"

const FEEDBACK_PROMPT =
  "If the user learned any new concepts, patterns, gotchas, or insights during this conversation that are worth retaining, suggest 1-3 concise flashcards and ask the user if they would like to save them to streamboard. Keep fronts as clear questions, backs concise with code blocks where relevant. Tag with the relevant technology. If nothing worth carding, say nothing."

function getCounterPath(): string {
  return process.env.STREAMBOARD_COUNTER_FILE ?? "/tmp/.streamboard-stop-count"
}

export async function runCapture(every: number): Promise<void> {
  const counterPath = getCounterPath()

  let count = 0
  try {
    const raw = readFileSync(counterPath, "utf-8").trim()
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isNaN(parsed)) {
      count = parsed
    }
  } catch {
    // Missing or unreadable file — start at 0
  }

  count++
  writeFileSync(counterPath, String(count), "utf-8")

  if (count % every === 0) {
    console.log(JSON.stringify({ feedback: FEEDBACK_PROMPT }))
  }
}

export const captureCommand = defineCommand({
  meta: {
    name: "capture",
    description:
      "Claude Code stop hook — periodically nudges Claude to suggest flashcards",
  },
  args: {
    every: {
      type: "string",
      description: "Emit feedback every N stops",
      default: "10",
    },
  },
  async run({ args }) {
    try {
      await runCapture(Number.parseInt(args.every, 10) || 10)
    } catch {
      // Always exit cleanly
    }
  },
})
