export {
  loadBuildContext,
  peekVersionId,
  resolveLatestVersion,
} from '~/composables/useBuildData'
export type { LoadedBuildData } from '~/composables/useBuildData'
// Re-exports the frontend's framework-agnostic build core, consumed in place.
// Resolved via the `~`/`@core` path aliases (see api/tsconfig.json + tsup/vitest).
export { computeBuild } from '~/lib/build/compute-build'
export type { BuildContext, BuildResult } from '~/lib/build/compute-build'
export { decodeRawBuild } from '~/lib/codec/build-codec'
export type { RawBuild } from '~/lib/codec/build-codec'
export { createCdnClient } from '~/lib/data/cdn-client'
export type { CdnClient } from '~/lib/data/cdn-client'
