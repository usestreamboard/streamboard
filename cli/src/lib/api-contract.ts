// Hand-authored oRPC contract for the routes the CLI consumes.
//
// We deliberately don't import from @streamboard/api: that would
// require publishing the full AppRouter type (admin routes, billing
// internals, analytics, etc.) which we want to keep private.
//
// Keep this in sync with packages/api/src/orpc/routes/*.ts in the
// private repo. If a CLI command needs a new route, add it here.

import type { Client } from "@orpc/client"

// ─── streamboards.list ────────────────────────────────────────────

export interface ListInput {
  limit?: number
  offset?: number
  cursor?: {
    createdAt: number
    id: string
  }
}

export interface ListItemPermissions {
  canUpdate: boolean
  canDelete: boolean
  canFlipToPrivate: boolean
  canFlipToPublic: boolean
}

export interface ListItem {
  id: string
  version: string
  title: string
  isPublic: boolean
  createdAt: number
  expiresAt: number | null
  organizationId: string | null
  folderId: string | null
  folderName: string | null
  isOwn: boolean
  permissions: ListItemPermissions
}

export interface ListOutput {
  items: ListItem[]
  entitlements: {
    tier: "free" | "trialing" | "active" | "frozen"
    reason: "trial_expired" | "subscription_inactive" | null
    canCreatePrivate: boolean
  }
  nextOffset: number | null
  nextCursor: { createdAt: number; id: string } | null
}

// ─── streamboards.get ─────────────────────────────────────────────

export interface GetInput {
  id: string
  /** Semver "X.Y.Z" or a bare legacy integer "N". Omit for latest. */
  version?: string
}

export interface GetOutput {
  id: string
  version: string
  title: string
  isPublic: boolean
  createdAt: number
  expiresAt: number | null
  organizationId: string | null
  folderId: string | null
  folderName: string | null
  isOwn: boolean
  spec: unknown
  themePreset: string | null
  creatorUserId: string | null
  permissions:
    | (ListItemPermissions & { canComment: boolean })
    | null
}

// ─── streamboards.create ──────────────────────────────────────────

export interface CreateInput {
  title: string
  spec: unknown
  isPublic?: boolean
  themePreset?: string | null
  releaseNote?: string | null
}

export interface CreateOutput {
  id: string
  version: string
}

// ─── streamboards.update ──────────────────────────────────────────

export interface UpdateInput {
  id: string
  spec: unknown
  /** Tri-state: omit to inherit, `null` to clear, string to set. */
  themePreset?: string | null
  releaseNote?: string | null
}

export interface UpdateOutput {
  id: string
  version: string
}

// ─── streamboards.delete ──────────────────────────────────────────

export interface DeleteInput {
  id: string
}

export interface DeleteOutput {
  deleted: true
}

// ─── streamboards.listVersions ────────────────────────────────────

export interface ListVersionsInput {
  id: string
}

export type ReleaseKind = "major" | "minor" | "patch"

export interface VersionRow {
  version: string
  kind: ReleaseKind
  releaseNote: string | null
  title: string
  createdAt: number
  themePreset: string | null
  creatorUserId: string | null
  creatorName: string | null
  creatorEmail: string | null
}

export type ListVersionsOutput = VersionRow[]

// ─── Contract ─────────────────────────────────────────────────────

/** Empty `ClientContext` — the CLI never passes per-call context. */
type Ctx = Record<never, never>

/**
 * Streamboards router shape. Each leaf is a callable matching
 * `@orpc/client`'s `Client` type: `(input, options?) => Promise<output>`.
 */
export type StreamboardsContract = {
  list: Client<Ctx, ListInput, ListOutput, Error>
  get: Client<Ctx, GetInput, GetOutput, Error>
  create: Client<Ctx, CreateInput, CreateOutput, Error>
  update: Client<Ctx, UpdateInput, UpdateOutput, Error>
  delete: Client<Ctx, DeleteInput, DeleteOutput, Error>
  listVersions: Client<Ctx, ListVersionsInput, ListVersionsOutput, Error>
}

/**
 * Shape passed to `createORPCClient<T>` and used as the CLI's client
 * type. Add new sub-routers here (and on the private side) as the CLI
 * grows.
 */
export type Contract = {
  streamboards: StreamboardsContract
}
