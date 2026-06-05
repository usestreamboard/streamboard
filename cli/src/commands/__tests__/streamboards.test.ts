import { describe, expect, test } from "vitest"
import { renderCodegen } from "../streamboards"

describe("renderCodegen", () => {
  test("renders a typed StreamboardState interface + push() helper", () => {
    const ts = renderCodegen({
      streamboardId: "26082684-26a3-4aef-b099-49000d032859",
      version: "2.0.0",
      baseUrl: "https://usestreamboard.com",
      fields: [
        {
          path: "kpis.mrr.value",
          componentType: "KPI",
          propName: "value",
          tsType: "string",
          jsonSchema: { type: "string" },
        },
        {
          path: "kpis.mrr.delta",
          componentType: "KPI",
          propName: "delta",
          tsType: "string | null",
          jsonSchema: { type: "string", nullable: true },
        },
        {
          path: "runs.recent",
          componentType: "LineChart",
          propName: "data",
          tsType: "Array<Record<string, string | number>>",
          jsonSchema: {
            type: "array",
            items: { type: "object", properties: {}, required: [] },
          },
        },
      ],
    })

    // Mentions source URL + version in the header
    expect(ts).toContain("streamboard streamboards codegen")
    expect(ts).toContain("26082684-26a3-4aef-b099-49000d032859")
    expect(ts).toContain("Streamboard version: 2.0.0")

    // Interface body — nested folding
    expect(ts).toContain("export interface StreamboardState")
    expect(ts).toContain("kpis: {")
    expect(ts).toContain("mrr: {")
    expect(ts).toContain("value: string")
    expect(ts).toContain("delta: string | null")
    expect(ts).toContain("runs: {")
    expect(ts).toContain("recent: Array<Record<string, string | number>>")

    // Push helper imports + uses the generic
    expect(ts).toContain('from "@streamboard/sdk"')
    expect(ts).toContain("new Streamboard<StreamboardState>")
    expect(ts).toContain("export async function push(")
    expect(ts).toContain("board.push(state, rest)")

    // Token-scoped: generated helpers don't bake a board id; the server
    // resolves the board from the token. The id appears only as
    // provenance in the header comment, never in the helper code.
    expect(ts).not.toContain("streamboardId:")

    // Pull helper alongside push — same surface, same auth resolution
    expect(ts).toContain("export async function pull(")
    expect(ts).toContain("board.pull(rest)")
    expect(ts).toContain("type PullResult")
    expect(ts).toContain("Promise<PullResult<StreamboardState>>")

    // Falls back to STREAMBOARD_TOKEN, allows override
    expect(ts).toContain("process.env.STREAMBOARD_TOKEN")
    expect(ts).toContain('options.baseUrl ?? "https://usestreamboard.com"')
  })

  test("emits a permissive interface body when no fields are bindable", () => {
    const ts = renderCodegen({
      streamboardId: "x",
      version: "1.0.0",
      baseUrl: "https://usestreamboard.com",
      fields: [],
    })
    expect(ts).toContain("[key: string]: unknown")
    // pull() must still be generated even when StreamboardState
    // collapses to the permissive index signature — otherwise a
    // freshly-minted board (no $bind refs yet) loses the read path
    // until codegen is re-run after the first bind is added.
    expect(ts).toContain("export async function pull(")
    expect(ts).toContain("board.pull(rest)")
  })

  test("pull() helper and push() helper share the same auth resolution", () => {
    const ts = renderCodegen({
      streamboardId: "y",
      version: "2.0.0",
      baseUrl: "https://preview.usestreamboard.com",
      fields: [
        {
          path: "x",
          componentType: "KPI",
          propName: "value",
          tsType: "string",
          jsonSchema: { type: "string" },
        },
      ],
    })
    // Both helpers should reference the same env var fallback so a
    // caller setting STREAMBOARD_TOKEN once works for both directions.
    expect(ts.match(/process\.env\.STREAMBOARD_TOKEN/g)?.length).toBe(2)
    // Both should plumb baseUrl from options OR fall back to the
    // codegen-baked value (the preview URL above).
    expect(
      ts.match(
        /options\.baseUrl \?\? "https:\/\/preview\.usestreamboard\.com"/g,
      )?.length,
    ).toBe(2)
  })
})
