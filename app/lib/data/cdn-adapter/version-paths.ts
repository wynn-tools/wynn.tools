/**
 * CDN path resolution for versioned game data snapshots.
 *
 * Decision:
 * - cdnPathFor(versionSegment, file) returns `${versionSegment}/${file}`.
 * - resolveVersionSegment(versionId) maps a build's numeric versionId to a CDN
 *   path segment: the newest version (index === WYNN_VERSION_LATEST) returns
 *   "latest" (follows the redirect so the app always gets the freshest pipeline
 *   output without redeploying); every historical versionId returns its exact
 *   contentHash from the bundled map below. An out-of-range versionId throws
 *   Error(`Unknown build version id ${versionId}`).
 *
 * Rationale: versionId→gameVersion (WYNN_VERSION_NAMES) → contentHash (from
 * cdn.wynn.tools/versions.json) is an exact 1:1 lookup, so old share URLs
 * resolve to their precise snapshot; newest uses the latest redirect.
 */

import { WYNN_VERSION_LATEST, WYNN_VERSION_NAMES } from '~/lib/codec/version'

/**
 * Content hashes indexed by versionId (matches WYNN_VERSION_NAMES order,
 * sourced from cdn.wynn.tools/versions.json).
 */
export const VERSION_HASHES: string[] = [
  '15db4c69', // 0: 2.0.1.1
  'c10b4794', // 1: 2.0.1.2
  'f0042b61', // 2: 2.0.2.1
  '5f5b7c67', // 3: 2.0.2.3
  'd710c711', // 4: 2.0.3.1
  '52a2cead', // 5: 2.0.4.1
  '33baca54', // 6: 2.0.4.3
  'c9c9e07c', // 7: 2.0.4.4
  'ec17a1d2', // 8: 2.1.0.0
  'e4872d66', // 9: 2.1.0.1
  '5724231c', // 10: 2.1.1.0
  '227b46af', // 11: 2.1.1.1
  'd8b5fb8b', // 12: 2.1.1.2
  '950f91d6', // 13: 2.1.1.3
  '87c8575a', // 14: 2.1.1.4
  'aff98124', // 15: 2.1.1.5
  '0101263c', // 16: 2.1.1.6
  'a2ff376e', // 17: 2.1.1.7
  'b9069a79', // 18: 2.1.2.0
  'ede1fb81', // 19: 2.1.3.0
  '9f43a86f', // 20: 2.1.3.4
  'b6f00df4', // 21: 2.1.4.0
  'c75dca6f', // 22: 2.1.5.0
  '430737f2', // 23: 2.1.6.0
  '0bf6dd67', // 24: 2.2.0.0
  'aba6e2ac', // 25: 2.2.0.7
  'd5b4bf0b', // 26: 2.2.0.12
  '688ea834', // 27: 2.2.0.14
  'd9315c95', // 28: 2.2.0.19
  '0f7a464a', // 29: 2.2.0.21
  '7a3e636e', // 30: 2.2.0.31
]

/**
 * Returns the CDN-relative path for a file within a version segment.
 * Example: cdnPathFor("latest", "items.json") → "latest/items.json"
 */
export function cdnPathFor(versionSegment: string, file: string): string {
  return `${versionSegment}/${file}`
}

/**
 * Resolves a numeric versionId (from a build share URL) to its CDN path segment.
 * The newest version returns "latest"; historical versions return their content hash.
 */
export function resolveVersionSegment(versionId: number): string {
  if (versionId < 0 || versionId >= WYNN_VERSION_NAMES.length) {
    throw new Error(`Unknown build version id ${versionId}`)
  }
  if (versionId === WYNN_VERSION_LATEST) {
    return 'latest'
  }
  return VERSION_HASHES[versionId]
}
