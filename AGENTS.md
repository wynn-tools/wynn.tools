# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server at http://localhost:3000
pnpm build        # production build
pnpm lint         # ESLint check
pnpm lint:fix     # ESLint auto-fix
pnpm test:run     # run all tests (Vitest, non-watch)
pnpm test         # Vitest watch mode
```

To run a single test file: `pnpm test:run app/lib/math/dps.test.ts`

Husky runs `pnpm lint:fix` on commit automatically. All commits must include a DCO sign-off (`git commit -s`).

## Architecture

### Stack

Nuxt 4 + Vue 3 + Pinia + Tailwind CSS v4 + Reka UI. Tests with Vitest (node environment). No SSR — purely client-side rendering. OG images generated server-side via Satori + resvg.

### Directory layout

```
app/
  pages/          # Nuxt file-based routing (builder/, map.vue)
  components/     # Vue components
  composables/    # Vue composables (use* pattern)
  stores/         # Pinia stores (build.ts, map.ts)
  lib/            # Pure TypeScript — no Vue, no DOM
    atree/        # Ability tree traversal and validation
    build/        # Build resolution and stat computation pipeline
    codec/        # Binary encode/decode for build share URLs
    data/         # CDN client and item/tome loaders
    items/        # Item icon resolution
    math/         # Combat math (DPS, defense, skillpoints, spells)
    types/        # Shared TypeScript interfaces
  config/         # Static config (map categories, worlds)
  types/          # App-level types (map.ts)
  assets/css/     # Tailwind + design tokens
```

### Builder data flow

Build share URLs encode the full build as a base64-like bit-packed string. The decode→compute→display pipeline:

1. **Codec** (`lib/codec/`) — `decodeRawBuild` reads the URL hash into a `RawBuild` (item IDs, powder counts, ability tree bits, tomes, aspects, level). Pure encoding — no game logic.
2. **Resolution** (`lib/build/resolve.ts`) — maps raw IDs to actual item/tome objects from the CDN JSON.
3. **Compute** (`lib/build/compute-build.ts`) — `computeBuild` is the pure orchestrator. Runs the full combat math chain: skillpoint calculation → stat aggregation → atree merging → spell/melee/defense outputs. Framework-agnostic.
4. **Store** (`stores/build.ts`) — `useBuildStore` owns async loading (fetches versioned data from CDN), holds `RawBuild` + `BuildContext`, and exposes mutations for item swaps and ability tree toggling.
5. **CDN data** — all game data is fetched from `https://cdn.wynn.tools/` via `CdnClient` (`lib/data/cdn-client.ts`, which deduplicates in-flight requests). The CDN serves immutable per-snapshot directories `data/{contentHash}/` (items, tomes, sets, encoding_consts, per-class `atree/{class}.json` and `aspects/{class}.json`, map) plus a root `versions.json` mapping each `gameVersion` → `contentHash`. `loadBuildContext` (`composables/useBuildData.ts`) is the single funnel: it fetches `versions.json`, resolves the build's `versionId` to a snapshot, fetches that snapshot's files, and runs each through its adapter before the builders.
6. **CDN adapters** (`lib/data/cdn-adapter/`) — the CDN's schema uses official v3-API names; the math expects the legacy hppeng shorthand. Thin pure adapters bridge them without touching the math: `version-paths.ts` (`versionId` is a 0-based offset from the anchor `ENCODING_BASE_VERSION` into `versions.json`; `resolveVersionSegment` → exact content hash; `cdnPathFor` → `data/{hash}/<file>`), `item-adapter.ts`/`key-maps.ts` (official ids → shorthand; `armour`→`armor`; `{min,max,raw}`→raw; damage `{min,max}`→`"min-max"`), `tome-adapter.ts`, `sets-adapter.ts`, `atree-adapter.ts` (per-class merge; `connections`→`parents`), `aspect-adapter.ts`. `lib/codec/*`, `lib/build/resolve.ts`, and `lib/math/*` are unchanged. Atree/aspect node descriptions are `string | NormalizedText[]` (rich styled segments on live data, plain string on backfilled historical snapshots).

### Map

Leaflet + Pixi.js overlay. `useMapStore` holds world/zoom/center/filter state. Composables own individual layers (`useTerritoryLayer`, `useMarkerLayer`, `useLootrunLayer`, etc.) and mount/unmount themselves. `useMapData` fetches POI/territory JSON from Athena (`https://athena.wynntils.com`). Map data intentionally stays on Athena — it is **not** sourced from the game-data CDN.

### Design tokens

Defined in `app/assets/css/global.css` as Tailwind `@theme` variables. Neutral palette uses OKLCH hue 30 (warm near-neutral). Accent is copper-bronze (hue 48). Use semantic token names (`bg`, `surface`, `surface-hi`, `border`, `muted`, `text`, `accent`) rather than raw color values. All seven self-hosted Wynncraft fonts (`wynn-ascii`, `wynn-common`, `wynn-default`, `wynn-five`, `wynn-wynnic`, `wynn-high-gavelian`, `wynn-old-fruman`) are available for in-game text rendering; `wynn-common` holds the elemental/combat icon glyphs.

### Runtime config

Two public runtime config values (overridable via env vars):

- `NUXT_PUBLIC_CDN_BASE_URL` — game data CDN root (default: `https://cdn.wynn.tools/`); `versions.json` lives at the root, snapshots under `data/{hash}/`
- `NUXT_PUBLIC_ATHENA_URL` — live game data API, also serves static map data (default: `https://athena.wynntils.com`)

### Testing

Tests live alongside source files (e.g. `lib/math/dps.test.ts`). Vitest alias `~` → `app/` matches the Nuxt path alias. All tests in `lib/` are pure unit tests with no DOM or Vue dependencies.
