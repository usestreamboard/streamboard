import { describe, expect, test, vi } from "vitest"
import { Streamboard, StreamboardError } from "../index"

const TOKEN = "sb_d_abcdefgh_ZZZZZZZZZZZZZZZZ"
const STREAMBOARD_ID = "abcdefgh"

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

const SCHEMA_BODY = {
  streamboardId: STREAMBOARD_ID,
  version: "2.0.0",
  fields: [
    {
      path: "kpis.mrr.value",
      componentType: "KPI",
      propName: "value",
      tsType: "string",
      jsonSchema: { type: "string" },
    },
  ],
  jsonSchema: { type: "object", properties: {} },
}

describe("Streamboard.schema", () => {
  test("GETs /schema with the bearer header and returns the doc", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SCHEMA_BODY))
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })

    const doc = await board.schema()

    expect(doc.streamboardId).toBe(STREAMBOARD_ID)
    expect(doc.version).toBe("2.0.0")
    expect(doc.fields[0].path).toBe("kpis.mrr.value")
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      `https://usestreamboard.com/api/data/v1/streamboards/${STREAMBOARD_ID}/schema`,
    )
    expect(init.method).toBe("GET")
    expect(init.headers["Authorization"]).toBe(`Bearer ${TOKEN}`)
  })

  test("honours a per-call streamboardId override", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ...SCHEMA_BODY, streamboardId: "other" }))
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })

    await board.schema({ streamboardId: "other" })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain("/streamboards/other/schema")
  })

  test("throws a protocol error on a malformed body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ streamboardId: STREAMBOARD_ID }))
    const board = new Streamboard({ token: TOKEN, fetch: fetchMock })

    await expect(board.schema()).rejects.toThrow(StreamboardError)
    await expect(board.schema()).rejects.toThrow(/Unexpected schema/)
  })
})
