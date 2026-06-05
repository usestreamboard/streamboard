import { describe, expect, test } from "vitest"
import type { SchemaField, SchemaResult } from "../index"
import { buildStateInterfaceBody, generate } from "../codegen"

function field(path: string, tsType: string): SchemaField {
  return { path, tsType, componentType: "X", propName: "p", jsonSchema: {} }
}

const DOC: Pick<SchemaResult, "streamboardId" | "version" | "fields"> = {
  streamboardId: "abcd",
  version: "3.0.0",
  fields: [
    field("kpis.mrr.value", "string"),
    field("kpis.mrr.trend", '"up" | "down" | "flat" | null'),
    field("rows", "Array<{ label: string; count: number }>"),
    field("ratio", "number"),
  ],
}

describe("buildStateInterfaceBody", () => {
  test("folds dotted paths into nested objects", () => {
    const body = buildStateInterfaceBody([
      field("kpis.mrr.value", "string"),
      field("kpis.mrr.trend", '"up" | "down" | "flat"'),
    ])
    expect(body).toContain("kpis: {")
    expect(body).toContain("mrr: {")
    expect(body).toContain("value: string")
    expect(body).toContain('trend: "up" | "down" | "flat"')
  })

  test("empty field set yields an open index signature", () => {
    expect(buildStateInterfaceBody([])).toBe("  [key: string]: unknown\n")
  })

  test("quotes keys that are not valid identifiers", () => {
    const body = buildStateInterfaceBody([field("weird-key", "string")])
    expect(body).toContain('"weird-key": string')
  })

  test("parent/child path collision keeps the deeper structure", () => {
    // When both `kpis.mrr` and `kpis.mrr.value` bind, the deeper object
    // wins and the parent's own scalar type is dropped (it becomes a
    // nested interface, not a leaf). Well-formed specs don't hit this.
    const body = buildStateInterfaceBody([
      field("kpis.mrr", "string"),
      field("kpis.mrr.value", "string"),
    ])
    expect(body).toContain("mrr: {")
    expect(body).toContain("value: string")
  })
})

describe("generate", () => {
  const code = generate(DOC)

  test("emits an exported StreamboardState interface with folded fields", () => {
    expect(code).toContain("export interface StreamboardState {")
    expect(code).toContain("kpis: {")
    expect(code).toContain("value: string")
    expect(code).toContain('trend: "up" | "down" | "flat" | null')
    expect(code).toContain("ratio: number")
    expect(code).toContain("rows: Array<{ label: string; count: number }>")
  })

  test("imports types + Streamboard from @streamboard/sdk", () => {
    expect(code).toContain('from "@streamboard/sdk"')
    expect(code).toContain("Streamboard,")
  })

  test("emits typed push and pull helpers", () => {
    expect(code).toContain(
      "export async function push(\n  state: StreamboardState,",
    )
    expect(code).toContain("export async function pull(")
  })

  test("generated helpers are token-scoped — no baked board id", () => {
    // The server resolves the board from the token, so the generated
    // push/pull construct the client with only token + baseUrl. The id
    // appears solely as provenance in the header comment, never in code.
    expect(code).not.toContain("streamboardId:")
  })

  test("stamps the source id and version in the header", () => {
    expect(code).toContain("streamboard-codegen abcd")
    expect(code).toContain("Streamboard version: 3.0.0")
  })

  test("bakes a custom baseUrl into the helpers and strips trailing slash", () => {
    const c = generate(DOC, { baseUrl: "http://localhost:4321/" })
    expect(c).toContain('baseUrl: options.baseUrl ?? "http://localhost:4321"')
  })

  test("handles a board with no bindable fields", () => {
    const c = generate({ streamboardId: "x", version: "1.0.0", fields: [] })
    expect(c).toContain("export interface StreamboardState {")
    expect(c).toContain("[key: string]: unknown")
  })
})
