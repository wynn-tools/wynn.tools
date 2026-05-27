/**
 * CDN path resolution for versioned game data snapshots.
 *
 * The new CDN serves content-hash snapshots at `data/{contentHash}/<file>` and a
 * root `versions.json` — a chronologically-ordered, append-only index mapping
 * each snapshot to its `gameVersion`.
 *
 * A build-share URL encodes a numeric `versionId` which is a 0-based offset from
 * the fixed anchor `ENCODING_BASE_VERSION` ('2.0.1.1' = versionId 0) into
 * `versions.json`. So:
 * - resolveVersionSegment(versionId, versions) → the concrete content hash at
 *   `anchorIndex + versionId`. Builds pin to their exact snapshot, making decode
 *   fully reproducible (a shared build always shows the data its creator saw).
 * - latestVersionId(versions) → the versionId a freshly created build should
 *   encode (the newest snapshot in versions.json).
 *
 * The app holds no hardcoded version list, so appending a new CDN snapshot needs
 * no redeploy. Each snapshot carries its own encoding_consts.json, so
 * versionId → hash → that snapshot's encoding_consts is correct by construction.
 */

import { ENCODING_BASE_VERSION } from '~/lib/codec/version'

/** One entry of the CDN root `versions.json`. */
export interface VersionEntry {
  hash: string
  gameVersion: string | null
  fetchedAt: string | null
}

function anchorIndex(versions: VersionEntry[]): number {
  const i = versions.findIndex(v => v.gameVersion === ENCODING_BASE_VERSION)
  if (i < 0)
    throw new Error(`versions.json missing anchor version ${ENCODING_BASE_VERSION}`)
  return i
}

/**
 * Returns the CDN-relative path for a file within a version segment.
 * Example: cdnPathFor("a3f82c91", "items.json") → "a3f82c91/items.json"
 */
export function cdnPathFor(versionSegment: string, file: string): string {
  return `${versionSegment}/${file}`
}

/**
 * Resolves a numeric versionId (from a build share URL) to its concrete content
 * hash, using the parsed root `versions.json`.
 */
export function resolveVersionSegment(versionId: number, versions: VersionEntry[]): string {
  if (versionId < 0)
    throw new Error(`Unknown build version id ${versionId}`)
  const entry = versions[anchorIndex(versions) + versionId]
  if (!entry)
    throw new Error(`Unknown build version id ${versionId}`)
  return entry.hash
}

/** The versionId a newly created build should encode (the newest snapshot). */
export function latestVersionId(versions: VersionEntry[]): number {
  return versions.length - 1 - anchorIndex(versions)
}
