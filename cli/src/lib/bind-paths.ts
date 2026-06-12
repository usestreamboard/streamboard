/**
 * Codegen helpers for the `streamboard streamboards codegen` command.
 *
 * The bind-field list comes from the server:
 * `GET /api/data/v1/streamboards/:id/schema` walks the board's latest
 * spec against the catalog (the single source of truth for which slots
 * are bindable) and returns one `BindField` per `{ $bind: "path" }`
 * ref. This module only folds those flat dotted paths into a nested
 * TypeScript interface body.
 *
 * History: this file used to vendor the private monorepo's
 * `BINDABLE_SLOTS` table and a local `extractBindPaths` walker. The
 * mirror drifted (it was missing eleven component entries by the time
 * it was removed) and nothing consumed it — the schema endpoint has
 * always been what the CLI actually uses. Don't reintroduce a local
 * slot table; if codegen needs new type information, extend the schema
 * endpoint's `BindField` payload instead.
 */

/** Minimal JSON Schema subset the schema endpoint emits. Loosely typed;
 *  we don't try to cover the whole spec — just what each bindable slot
 *  needs. */
export type JsonSchemaValue =
  | { type: "string"; nullable?: boolean; enum?: string[] }
  | { type: "number"; nullable?: boolean }
  | { type: "boolean"; nullable?: boolean }
  | {
      type: "array"
      items: JsonSchemaValue
    }
  | {
      type: "object"
      properties: Record<string, JsonSchemaValue>
      required: string[]
      additionalProperties?: boolean | JsonSchemaValue
    }

/** Single bindable reference found in a spec, as served by `/schema`. */
export interface BindField {
  /** Dotted path inside the state envelope, e.g. `"kpis.mrr.value"`. */
  path: string
  /** Component name the bind sits on (e.g. `"KPI"`). */
  componentType: string
  /** Prop name on that component (e.g. `"value"`). */
  propName: string
  /** TypeScript type string for codegen. */
  tsType: string
  /** JSON Schema fragment for the value at this path. */
  jsonSchema: JsonSchemaValue
}

/**
 * Build a nested object type from flat dotted paths. Paths like
 * `kpis.mrr.value` get folded into `{ kpis: { mrr: { value: ... } } }`.
 * Returns the TS source for a single interface body (no enclosing
 * `interface X { ... }` wrapper — caller adds that).
 */
export function buildStateInterfaceBody(fields: BindField[]): string {
  if (fields.length === 0) return "  [key: string]: unknown\n"

  type Node = { children: Map<string, Node>; tsType?: string }
  const root: Node = { children: new Map() }

  for (const field of fields) {
    const segments = field.path.split(".")
    let node = root
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i]
      if (!seg) continue
      let child = node.children.get(seg)
      if (!child) {
        child = { children: new Map() }
        node.children.set(seg, child)
      }
      node = child
    }
    const leaf = segments[segments.length - 1]
    if (!leaf) continue
    const existing = node.children.get(leaf)
    if (existing) {
      // Path collision (a parent of a deeper path also has its own
      // bind, e.g. both `kpis.mrr` and `kpis.mrr.value` exist).
      // Keep the deeper type; mark the parent as `unknown` so the
      // generated type at least compiles. Conflicts like this
      // shouldn't occur in well-formed specs — log + skip silently
      // here, surface the warning at the API layer.
      existing.tsType = "unknown"
    } else {
      node.children.set(leaf, { children: new Map(), tsType: field.tsType })
    }
  }

  return renderNode(root, 1)
}

interface RenderableNode {
  children: Map<string, RenderableNode>
  tsType?: string
}

function renderNode(node: RenderableNode, depth: number): string {
  const indent = "  ".repeat(depth)
  const lines: string[] = []
  for (const [name, child] of node.children) {
    const safe = isValidIdentifier(name) ? name : JSON.stringify(name)
    if (child.tsType && child.children.size === 0) {
      lines.push(`${indent}${safe}: ${child.tsType}`)
    } else {
      lines.push(`${indent}${safe}: {`)
      lines.push(renderNode(child, depth + 1))
      lines.push(`${indent}}`)
    }
  }
  return lines.join("\n")
}

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
}
