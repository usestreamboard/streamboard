/**
 * Streamboard data-token format primitives.
 *
 * Tokens are `sb_d_<id>_<secret>` strings minted in the streamboard
 * web app at `/app/s/:id/tokens`. The `<id>` segment is the *token's*
 * own lookup key (`streamboardDataToken.id`) — NOT the board id. The
 * two are independent random strings, so the board id can't be derived
 * from the token; callers pass it explicitly as `streamboardId`. This
 * parser exists only to validate token shape and split out the secret.
 *
 * Mirrors `parseToken` in `packages/api/src/lib/tokens.ts` on the
 * server side. Kept inline (rather than imported) so the SDK has
 * zero workspace dependencies — published as a flat npm package
 * that any cron / Worker / Bun script can consume.
 */

export const TOKEN_PREFIX = "sb_d"

export interface ParsedToken {
  /** Token's own id segment — matches `streamboardDataToken.id`, NOT the board id. */
  id: string
  /** Base64url bearer secret — sent verbatim in the Authorization header. */
  secret: string
}

/**
 * Pull `{ id, secret }` out of a raw bearer string. Returns `null` if
 * the shape doesn't match `sb_d_<id>_<secret>`. Strict on the prefix
 * to avoid swallowing unrelated tokens.
 */
export function parseToken(raw: string | null | undefined): ParsedToken | null {
  if (!raw) return null
  // Four segments: `sb`, `d`, `<id>`, `<secret>`. The base32 + base64url
  // alphabets don't contain underscores, so split-on-`_` is safe.
  const parts = raw.split("_")
  if (parts.length !== 4) return null
  if (parts[0] !== "sb" || parts[1] !== "d") return null
  const id = parts[2]
  const secret = parts[3]
  if (!id || !secret) return null
  if (id.length < 4 || secret.length < 16) return null
  return { id, secret }
}
