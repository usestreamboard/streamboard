import { describe, expect, test } from "vitest"
import { parseToken, TOKEN_PREFIX } from "../parse-token"

describe("parseToken", () => {
  test("returns null for null / undefined / empty", () => {
    expect(parseToken(null)).toBeNull()
    expect(parseToken(undefined)).toBeNull()
    expect(parseToken("")).toBeNull()
  })

  test("returns null when the segment count is wrong", () => {
    expect(parseToken("sb_d_abc")).toBeNull() // 3 segments
    expect(parseToken("sb_d_abc_def_ghi")).toBeNull() // 5 segments
  })

  test("returns null when the prefix doesn't match exactly", () => {
    expect(parseToken("sb_x_abcd_secretxxxxxxxxxxxxx")).toBeNull()
    expect(parseToken("xx_d_abcd_secretxxxxxxxxxxxxx")).toBeNull()
    expect(parseToken("SB_D_abcd_secretxxxxxxxxxxxxx")).toBeNull()
  })

  test("returns null when id or secret is too short", () => {
    expect(parseToken("sb_d_a_secretxxxxxxxxxxxxx")).toBeNull() // id < 4
    expect(parseToken("sb_d_abcd_short")).toBeNull() // secret < 16
  })

  test("returns id + secret on a well-formed token", () => {
    expect(parseToken("sb_d_abcdefgh_ZZZZZZZZZZZZZZZZ")).toEqual({
      id: "abcdefgh",
      secret: "ZZZZZZZZZZZZZZZZ",
    })
  })

  test("exports the prefix constant", () => {
    expect(TOKEN_PREFIX).toBe("sb_d")
  })
})
