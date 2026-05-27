/**
 * CDN path resolution for versioned game data snapshots.
 *
 * The new CDN serves content-hash snapshots at `data/{contentHash}/<file>` plus
 * a `data/latest/` redirect, and a root `versions.json` mapping each
 * `gameVersion` → `contentHash`.
 *
 * Decision:
 * - cdnPathFor(versionSegment, file) returns `${versionSegment}/${file}`.
 * - resolveVersionSegment(versionId, versions) maps a build's numeric versionId
 *   to a CDN path segment. `versions` is the parsed root `versions.json` (the
 *   single source of truth — injected so this stays a pure, testable function
 *   and the loader owns the one cached fetch). The newest version
 *   (index === WYNN_VERSION_LATEST) returns "latest" (follows the redirect so
 *   the app always gets the freshest pipeline output without redeploying);
 *   every historical versionId resolves to the hash whose `gameVersion` equals
 *   WYNN_VERSION_NAMES[versionId]. The dot-format game versions in
 *   WYNN_VERSION_NAMES match versions.json exactly, so this is a 1:1 lookup and
 *   old share URLs resolve to their precise snapshot.
 */

import { WYNN_VERSION_LATEST, WYNN_VERSION_NAMES } from '~/lib/codec/version'

/** One entry of the CDN root `versions.json`. */
export interface VersionEntry {
  hash: string
  gameVersion: string | null
  fetchedAt: string | null
}

/**
 * Returns the CDN-relative path for a file within a version segment.
 * Example: cdnPathFor("latest", "items.json") → "latest/items.json"
 */
export function cdnPathFor(versionSegment: string, file: string): string {
  return `${versionSegment}/${file}`
}

/**
 * Resolves a numeric versionId (from a build share URL) to its CDN path segment,
 * using the parsed root `versions.json`. The newest version returns "latest";
 * historical versions return the content hash whose gameVersion matches.
 */
export function resolveVersionSegment(versionId: number, versions: VersionEntry[]): string {
  if (versionId < 0 || versionId >= WYNN_VERSION_NAMES.length)
    throw new Error(`Unknown build version id ${versionId}`)
  if (versionId === WYNN_VERSION_LATEST)
    return 'latest'
  const gameVersion = WYNN_VERSION_NAMES[versionId]
  const entry = versions.find(v => v.gameVersion === gameVersion)
  if (!entry)
    throw new Error(`No CDN snapshot for game version ${gameVersion}`)
  return entry.hash
}
