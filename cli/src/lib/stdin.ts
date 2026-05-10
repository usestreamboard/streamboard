import { outputError } from "./output"

/** Read JSON from stdin. Exits with error if stdin is empty or invalid JSON. */
export async function readStdin<T>(): Promise<T> {
  if (process.stdin.isTTY) {
    outputError("Expected JSON input on stdin. Use --stdin and pipe data.")
  }

  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }

  const raw = Buffer.concat(chunks).toString("utf-8").trim()
  if (!raw) {
    outputError("Empty stdin")
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    outputError("Invalid JSON on stdin")
  }
}
