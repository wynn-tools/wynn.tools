/**
 * CDN path resolution for versioned game data snapshots.
 *
 * The CDN serves snapshots at `data/{gameVersion}/<file>` (e.g. `data/2.2.0.31/`)
 * and a root `versions.json` — a chronologically-ordered, append-only index
 * mapping each snapshot's `gameVersion` to its content `hash`.
 *
 * A build-share URL encodes a numeric `versionId` which is a 0-based offset from
 * the fixed anchor `ENCODING_BASE_VERSION` ('2.0.1.1' = versionId 0) into
 * `versions.json`. So:
 * - resolveVersionSegment(versionId, versions) → the gameVersion path segment at
 *   `anchorIndex + versionId`. Builds pin to their exact snapshot, making decode
 *   fully reproducible (a shared build always shows the data its creator saw).
 * - latestVersionId(versions) → the versionId a freshly created build should
 *   encode (the newest snapshot in versions.json).
 *
 * The app holds no hardcoded version list, so appending a new CDN snapshot needs
 * no redeploy. Each snapshot carries its own encoding_consts.json, so
 * versionId → gameVersion → that snapshot's encoding_consts is correct by
 * construction.
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
 * Returns the CDN-relative path for a snapshot file within a version segment.
 * Snapshots live under `data/` (the root holds `versions.json`); the CDN base
 * URL is `https://cdn.wynn.tools/`.
 * Example: cdnPathFor("2.2.0.31", "items.json") → "data/2.2.0.31/items.json"
 */
export function cdnPathFor(versionSegment: string, file: string): string {
  return `data/${versionSegment}/${file}`
}

/**
 * Resolves a numeric versionId (from a build share URL) to its gameVersion path
 * segment, using the parsed root `versions.json`.
 */
export function resolveVersionSegment(versionId: number, versions: VersionEntry[]): string {
  if (versionId < 0)
    throw new Error(`Unknown build version id ${versionId}`)
  const entry = versions[anchorIndex(versions) + versionId]
  if (!entry)
    throw new Error(`Unknown build version id ${versionId}`)
  if (entry.gameVersion == null)
    throw new Error(`versions.json entry at id ${versionId} has no gameVersion`)
  return entry.gameVersion
}

/**
 * The versionId a newly created build should encode: the newest snapshot that
 * has a gameVersion. A freshly-fetched snapshot may be appended before it is
 * version-tagged; such an entry has no `data/{gameVersion}/` directory to serve,
 * so it is skipped here.
 */
export function latestVersionId(versions: VersionEntry[]): number {
  let last = -1
  for (let i = 0; i < versions.length; i++) {
    if (versions[i]!.gameVersion != null)
      last = i
  }
  if (last < 0)
    throw new Error('versions.json has no version-tagged snapshot')
  return last - anchorIndex(versions)
}
