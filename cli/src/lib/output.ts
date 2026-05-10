/**
 * Write data to stdout as JSON.
 * Default: compact (single line). With pretty: indented.
 */
export function output(data: unknown, pretty = false): void {
  console.log(pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data))
}

/**
 * Write an error to stderr as JSON and exit with non-zero code.
 * Optional `code` provides a machine-readable error identifier for programmatic callers.
 */
export function outputError(
  message: string,
  options?: { code?: string; exitCode?: number },
): never {
  const payload: { error: string; code?: string } = { error: message }
  if (options?.code) payload.code = options.code
  console.error(JSON.stringify(payload))
  process.exit(options?.exitCode ?? 1)
}
