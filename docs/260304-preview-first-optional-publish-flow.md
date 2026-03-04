# Preview First, Optional Publish Flow

This doc defines a no-CMS, no-manual-admin flow:

- user connects LinkedIn via DataConnect
- immediately sees a rendered ReadCV-style result
- optionally publishes it to a public URL later

The key product principle is: **connection does not imply publication**.

## Product goals

- Show value fast: render profile immediately after hydration.
- Do not force handle selection before preview.
- Let user choose if/when to publish.
- Avoid git-backed deploy per publish.
- Avoid a full backend CMS or account system.

## Non-goals

- No rich dashboard for content editing.
- No multi-role admin panel.
- No manual moderation workflow in v1.

## UX flow (proposed)

1. User clicks `Connect LinkedIn with Vana`.
2. Data hydrates and profile renders immediately.
3. A top banner appears on the rendered profile:
   - `Save this profile?`
   - input: `handle`
   - toggle: `Public profile` (off by default)
   - action: `Save profile`
4. If user skips, nothing is published.
5. If user saves:
   - profile snapshot is persisted
   - optional public URL is enabled at `/u/{handle}`
6. Later, user can reconnect and manage visibility (`public` on/off) via the same identity method.

## Why this ordering is right

- Most users want to see proof first, not fill forms first.
- Handle choice is commitment; preview is exploration.
- Publishing is an explicit step, not an accidental side effect of connect.

## Storage pattern (no CMS, object-first)

Use object storage as the source of truth (S3/R2/Blob-compatible).

### Objects

- `profiles/{handle}/current.json`
  - pointer object with:
  - `snapshotId`
  - `ownerAddress`
  - `isPublic`
  - `updatedAt`
- `profiles/{handle}/snapshots/{snapshotId}.json`
  - immutable normalized ReadCV JSON payload
- `profiles/{handle}/meta.json`
  - optional metadata (createdAt, lastPublishedAt, version)

This gives us immutable history + mutable "current" pointer without a CMS.

## Identity and authorization (critical)

No traditional login needed, but mutating actions still need auth.

Use the same wallet identity implied by DataConnect/Vana flow:

- server issues nonce
- client signs nonce
- server verifies address
- mutating operations (`save`, `setPublic`, `unpublish`) require valid signature

Handle ownership rule:

- first valid save claims handle with `ownerAddress`
- subsequent mutations require same address

## API shape (minimal)

- `POST /api/profile/prepare-save`
  - returns nonce
- `POST /api/profile/save`
  - body: `handle`, `payload`, `isPublic`, `signature`, `address`, `nonce`
  - creates snapshot + updates pointer
- `POST /api/profile/visibility`
  - body: `handle`, `isPublic`, `signature`, `address`, `nonce`
- `GET /api/profile/public/[handle]`
  - returns current snapshot only if `isPublic=true`

Public route:

- `/u/[handle]` fetches `current.json`, checks `isPublic`, renders snapshot.

## Caching and static behavior

To make this globally fast like static exports:

- cache `/u/[handle]` at edge/CDN
- purge or revalidate on publish/unpublish
- render from immutable snapshot payload

This behaves "static-like" for readers without forcing a redeploy per save.

## Explicit pushback (important)

These are the bits that are risky if we skip guardrails:

1. "No login at all" is fine, but "no auth at all" is not fine.
   - Without signature checks, anyone can hijack any handle.

2. "Just store an object and done" is almost enough, but collisions matter.
   - Two users can race for same handle unless claim is atomic.
   - Use conditional writes (`If-None-Match`/CAS semantics) on handle claim.

3. "Turn it off later by reconnecting" is good, but only if ownership is verified.
   - Reconnect alone is not enough; verify signer address matches handle owner.

4. Pure object storage is doable, but you still need a robust claim strategy.
   - If storage does not support atomic conditional writes, add a tiny lock/claim service.
   - This is still not a CMS.

## v1 decision

Ship this:

- Preview-first hydration UX
- Optional publish banner
- Handle claim on save
- Public toggle
- Signature-based ownership checks
- Object storage snapshots + pointer

Defer this:

- full profile editor
- admin dashboard
- social features

## Implementation note for this repo

Current `ProfileHydrationFlow` already has the right place to add banner UI: after `ready` render, before/above main profile content.

No change is needed to the connect/data contract. This is a post-hydration persistence layer.
