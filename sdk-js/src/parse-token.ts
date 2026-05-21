/**
 * Streamboard data-token format primitives.
 *
 * Tokens are `sb_d_<id>_<secret>` strings minted in the streamboard
 * web app at `/app/s/:id/tokens`. The `<id>` segment is the public
 * lookup key and lets the SDK derive the target streamboardId without
 * the caller specifying it twice.
 *
 * Mirrors `parseToken` in `packages/api/src/lib/tokens.ts` on the
 * server side. Kept inline (rather than imported) so the SDK has
 * zero workspace dependencies — published as a flat npm package
 * that any cron / Worker / Bun script can consume.
 */

export const TOKEN_PREFIX = "sb_d"

export interface ParsedToken {
  /** Public id segment — matches `streamboardDataToken.id`. */
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
