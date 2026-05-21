// Vendored from packages/streamboard/src/extract-bind-paths.ts in the private streamboard monorepo. Keep in sync if the upstream codegen logic changes.

/**
 * Walk a streamboard spec and collect every `{ $bind: "path" }`
 * reference, paired with the TypeScript + JSON Schema type the
 * referenced value must satisfy.
 *
 * Powers two things:
 *   1. `GET /api/data/v1/streamboards/:id/schema` — the data-token
 *      bearer fetches this so worker code knows what shape to push.
 *   2. `streamboard codegen <id>` — generates a per-board TypeScript
 *      interface that the SDK's `Streamboard<TState>` generic
 *      consumes for compile-time check.
 *
 * Implementation choice: rather than reflecting into the catalog's
 * Zod schemas (which span the zod v3/v4 boundary and are awkward to
 * walk), we maintain a small explicit map of bindable slot types.
 * The catalog is the source of truth for which slots are bindable
 * (see `bindable()` wrapper in `packages/streamboard/src/catalog.ts`);
 * this table mirrors those slots one-for-one. Add a new bindable
 * slot in the catalog -> add a row here. Tests pin the mirror.
 */

/** Inlined from `@usecarte/core` — structural predicate for a `{ $bind: string }` ref. */
function isBindRef(value: unknown): value is { $bind: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$bind" in value &&
    typeof (value as { $bind: unknown }).$bind === "string"
  )
}

// ─── Bindable slot type table ─────────────────────────────────────

/** Concrete TypeScript + JSON Schema descriptor for a bindable slot. */
export interface BindableSlotType {
  /** Human-readable TS type string for codegen. */
  tsType: string
  /** JSON Schema draft 2020-12 fragment for the slot's value. */
  jsonSchema: JsonSchemaValue
}

/** Minimal JSON Schema subset we emit. Loosely typed; we don't try to
 *  cover the whole spec — just what each bindable slot needs. */
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

const SPARKLINE_CONFIG_TS =
  '{ data: number[] | Array<{ x: string | number; y: number }>; ariaLabel: string; variant?: "line" | "area" | "bar" | null; width?: number | null; height?: number | null; showEndpoint?: boolean | null; showRange?: boolean | null; baseline?: "zero" | "min" | number | null; color?: string | null; thresholds?: { good?: number | null; warn?: number | null; bad?: number | null; direction?: "higher-is-better" | "lower-is-better" | null } | null; highlightTail?: number | null; referenceLine?: number | "mean" | "median" | null }'

/**
 * Bindable-slot table. Mirrors `bindable()` wrappers in
 * `packages/streamboard/src/catalog.ts`. Keyed by component name,
 * then prop name.
 */
export const BINDABLE_SLOTS: Record<
  string,
  Record<string, BindableSlotType>
> = {
  KPI: {
    value: {
      tsType: "string",
      jsonSchema: { type: "string" },
    },
    delta: {
      tsType: "string | null",
      jsonSchema: { type: "string", nullable: true },
    },
    trend: {
      tsType: '"up" | "down" | "flat" | null',
      jsonSchema: {
        type: "string",
        nullable: true,
        enum: ["up", "down", "flat"],
      },
    },
    sparkline: sparklineConfig(),
  },
  KeyMetric: {
    sparkline: sparklineConfig(),
  },
  Sparkline: {
    data: sparklineData(),
  },
  StatGrid: {
    stats: {
      tsType:
        `Array<{ label: string; value: string; delta?: string | null; trend?: "up" | "down" | "flat" | null; sparkline?: ${SPARKLINE_CONFIG_TS} | null }>`,
      jsonSchema: {
        type: "array",
        items: {
          type: "object",
          required: ["label", "value"],
          properties: {
            label: { type: "string" },
            value: { type: "string" },
            delta: { type: "string", nullable: true },
            trend: {
              type: "string",
              nullable: true,
              enum: ["up", "down", "flat"],
            },
            sparkline: sparklineConfig().jsonSchema,
          },
        },
      },
    },
  },
  LineChart: {
    data: chartRowArray(),
  },
  AreaChart: {
    data: chartRowArray(),
  },
  BarChart: {
    data: chartRowArray(),
  },
  PieChart: {
    data: {
      tsType: "Array<{ name: string; value: number; color?: string | null }>",
      jsonSchema: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "value"],
          properties: {
            name: { type: "string" },
            value: { type: "number" },
            color: { type: "string", nullable: true },
          },
        },
      },
    },
  },
}

/** `Sparkline.data` — bare number[] or {x,y}[]. JSON Schema can't OR the
 *  two array shapes in this minimal subset, so it documents the number[]
 *  form; the tsType carries the full union for codegen. */
function sparklineData(): BindableSlotType {
  return {
    tsType:
      "number[] | Array<{ x: string | number; y: number }>",
    jsonSchema: { type: "array", items: { type: "number" } },
  }
}

/** The whole embedded `sparkline` config object (bound as one value —
 *  no per-field binding inside it). */
function sparklineConfig(): BindableSlotType {
  return {
    tsType: SPARKLINE_CONFIG_TS,
    jsonSchema: {
      type: "object",
      required: ["data", "ariaLabel"],
      properties: {
        data: { type: "array", items: { type: "number" } },
        ariaLabel: { type: "string" },
      },
      additionalProperties: true,
    },
  }
}

function chartRowArray(): BindableSlotType {
  return {
    tsType: "Array<Record<string, string | number>>",
    jsonSchema: {
      type: "array",
      items: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: { type: "string" }, // string OR number; JSON Schema can't OR cleanly in this minimal subset, so we accept string and document number in tsType
      },
    },
  }
}

// ─── Spec walker ─────────────────────────────────────────────────

/** Minimal streamboard spec shape — see `@json-render/core`. */
export interface SpecLike {
  root?: string
  elements?: Record<
    string,
    {
      type?: string
      props?: Record<string, unknown>
      children?: string[]
    }
  >
}

/** Single bindable reference found in a spec. */
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
 * Walk a spec, return every `{ $bind: "path" }` reference paired
 * with the type the referenced value must take. Duplicate paths
 * (multiple slots binding the same key) are de-duplicated; the
 * first occurrence wins, conflicts are silently dropped (the
 * MCP / web server is responsible for catching schema conflicts
 * elsewhere — this helper is a flat reader).
 *
 * Unknown component types and non-bindable props are ignored.
 * Slots whose value is a literal (not a `$bind` ref) are ignored.
 */
export function extractBindPaths(spec: SpecLike): BindField[] {
  const out: BindField[] = []
  const seen = new Set<string>()

  for (const element of Object.values(spec?.elements ?? {})) {
    const componentType = element?.type
    if (!componentType) continue
    const bindable = BINDABLE_SLOTS[componentType]
    if (!bindable) continue

    for (const [propName, slot] of Object.entries(bindable)) {
      const value = element.props?.[propName]
      if (!isBindRef(value)) continue
      const path = (value as { $bind: string }).$bind
      if (typeof path !== "string" || !path) continue
      if (seen.has(path)) continue
      seen.add(path)
      out.push({
        path,
        componentType,
        propName,
        tsType: slot.tsType,
        jsonSchema: slot.jsonSchema,
      })
    }
  }

  return out
}

// ─── Codegen helpers ──────────────────────────────────────────────

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

function renderNode(
  node: { children: Map<string, any>; tsType?: string },
  depth: number,
): string {
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
