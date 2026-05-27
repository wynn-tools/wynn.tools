/**
 * The game version encoded as `versionId` 0 in build-share URLs (fixed anchor).
 *
 * `versionId` is a 0-based offset from this anchor's position in the CDN's
 * chronologically-ordered `versions.json`. The app does not hardcode the full
 * version list — it derives every snapshot hash from `versions.json` at runtime
 * (see `lib/data/cdn-adapter/version-paths.ts`), so new game versions are picked
 * up without a redeploy.
 */
export const ENCODING_BASE_VERSION = '2.0.1.1'
