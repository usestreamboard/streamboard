import { describe, expect, test } from "vitest"
import { renderCodegen } from "../streamboards"

describe("renderCodegen", () => {
  test("renders a typed StreamboardState interface + push() helper", () => {
    const ts = renderCodegen({
      streamboardId: "26082684-26a3-4aef-b099-49000d032859",
      version: 2,
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
    expect(ts).toContain("Streamboard version: 2")

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

    // Falls back to STREAMBOARD_TOKEN, allows override
    expect(ts).toContain("process.env.STREAMBOARD_TOKEN")
    expect(ts).toContain('options.baseUrl ?? "https://usestreamboard.com"')
  })

  test("emits a permissive interface body when no fields are bindable", () => {
    const ts = renderCodegen({
      streamboardId: "x",
      version: 1,
      baseUrl: "https://usestreamboard.com",
      fields: [],
    })
    expect(ts).toContain("[key: string]: unknown")
  })
})
