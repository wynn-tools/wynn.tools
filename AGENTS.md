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

This is a pnpm workspace (`pnpm-workspace.yaml`): the root is the Nuxt frontend, `api/` is a separate backend package with its own scripts (run from `api/`):

```bash
cd api
pnpm db:dev:up     # start a dev Postgres via docker (deploy/compose.dev.yaml)
pnpm dev           # tsx watch, reads api/.env
pnpm db:generate   # generate a Drizzle migration after editing src/db/schema.ts
pnpm db:migrate    # apply migrations
pnpm test:run      # vitest — needs the test DB up: `pnpm db:test:up` first (Postgres on :5433)
```

Run a single backend test: `cd api && pnpm test:run market-cache`.

Husky runs `pnpm lint:fix` on commit automatically. All commits must include a DCO sign-off (`git commit -s`). Commit messages in this repo are a subject line plus the `Signed-off-by:` trailer only — no body paragraphs.

## Architecture

### Stack

Nuxt 4 + Vue 3 + Pinia + Tailwind CSS v4 + Reka UI. Tests with Vitest (node environment). No SSR — purely client-side rendering. OG images generated server-side via `nuxt-og-image` with the **Takumi** renderer (satori + resvg are uninstalled; OG components use the `*.takumi.vue` suffix). The backend (`api/`) is a separate Hono + Drizzle + Postgres service — see "Accounts, sharing & prices" below.

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
    market/       # WynnVentory price summarization, build cost, emerald + powder formatting (pure)
    math/         # Combat math (DPS, defense, skillpoints, spells)
    types/        # Shared TypeScript interfaces
  config/         # Static config (map categories, worlds)
  types/          # App-level types (map.ts)
  assets/css/     # Tailwind + design tokens
api/              # Backend (own workspace pkg): Hono + Drizzle + Postgres
  src/routes/     # One Hono module per resource (builds, items, keys, profile, auth, market)
  src/services/   # api-keys, sessions, discord, wynnventory client + market cache
  src/db/         # Drizzle schema + client; migrations in api/drizzle/
deploy/           # docker-compose for dev/test Postgres
```

### Builder data flow

Build share URLs encode the full build as a base64-like bit-packed string. The decode→compute→display pipeline:

1. **Codec** (`lib/codec/`) — `decodeRawBuild` reads the URL hash into a `RawBuild` (item IDs, powder counts, ability tree bits, tomes, aspects, level). Pure encoding — no game logic.
2. **Resolution** (`lib/build/resolve.ts`) — maps raw IDs to actual item/tome objects from the CDN JSON.
3. **Compute** (`lib/build/compute-build.ts`) — `computeBuild` is the pure orchestrator. Runs the full combat math chain: skillpoint calculation → stat aggregation → atree merging → spell/melee/defense outputs. Framework-agnostic.
4. **Store** (`stores/build.ts`) — `useBuildStore` owns async loading (fetches versioned data from CDN), holds `RawBuild` + `BuildContext`, and exposes mutations for item swaps and ability tree toggling.
5. **CDN data** — all game data is fetched from `https://cdn.wynn.tools/` via `CdnClient` (`lib/data/cdn-client.ts`, which deduplicates in-flight requests). The CDN serves immutable per-snapshot directories `data/{gameVersion}/` (e.g. `data/2.2.0.31/`; items, tomes, sets, encoding_consts, per-class `atree/{class}.json` and `aspects/{class}.json`, map) plus a root `versions.json` mapping each `gameVersion` → `contentHash`. `loadBuildContext` (`composables/useBuildData.ts`) is the single funnel: it fetches `versions.json`, resolves the build's `versionId` to a snapshot, fetches that snapshot's files, and runs each through its adapter before the builders.
6. **CDN adapters** (`lib/data/cdn-adapter/`) — the CDN's schema uses official v3-API names; the math expects the legacy hppeng shorthand. Thin pure adapters bridge them without touching the math: `version-paths.ts` (`versionId` is a 0-based offset from the anchor `ENCODING_BASE_VERSION` into `versions.json`; `resolveVersionSegment` → the snapshot's `gameVersion`; `cdnPathFor` → `data/{gameVersion}/<file>`), `item-adapter.ts`/`key-maps.ts` (official ids → shorthand; `armour`→`armor`; `{min,max,raw}`→raw; damage `{min,max}`→`"min-max"`), `tome-adapter.ts`, `sets-adapter.ts`, `atree-adapter.ts` (per-class merge; `connections`→`parents`), `aspect-adapter.ts`. `lib/codec/*`, `lib/build/resolve.ts`, and `lib/math/*` are unchanged. Atree/aspect node descriptions are `string | NormalizedText[]` (rich styled segments on live data, plain string on backfilled historical snapshots).

### Map

Leaflet + Pixi.js overlay. `useMapStore` holds world/zoom/center/filter state. Composables own individual layers (`useTerritoryLayer`, `useMarkerLayer`, `useLootrunLayer`, etc.) and mount/unmount themselves. `useMapData` fetches POI/territory JSON from Athena (`https://athena.wynntils.com`). Map data intentionally stays on Athena — it is **not** sourced from the game-data CDN.

### Accounts, sharing & prices (`api/`)

A separate Hono + Drizzle + Postgres service (deployed at `api.wynn.tools`) that backs the sharing layer (saved builds, crafted items, profiles, API keys) and the market-price proxy. The frontend reaches it through `createApiClient` / `useApi` (`app/composables/useApi.ts`) over cookie sessions. It is **not** the game-data CDN, and map data still comes from Athena.

- **Auth** (`src/middleware/auth.ts`) — a request authenticates via either a Discord-OAuth **session cookie** (full access, capability `*`) or a **bearer API key** (`Authorization: Bearer …`) carrying its scopes. Scopes (`src/services/api-keys.ts`): `builds:read|write`, `items:read|write`. Cookie-based mutations require a same-origin `Origin` (CSRF guard); bearer mutations don't.
- **Routes** (`src/routes/*`) — one Hono module per resource, mounted under `/v1/*` in `src/app.ts` behind a CORS lock to `FRONTEND_URL` and a per-bearer rate limit. Schema in `src/db/schema.ts`; generate a migration with `pnpm db:generate` after editing it.
- **Discord bot** — A read-only HTTP Interactions endpoint at `/v1/discord/interactions` serves `/item`, `/price`, and `/builds` slash commands. Ed25519-verified, exempt from CORS + rate-limit. Requires `DISCORD_PUBLIC_KEY` and `DISCORD_APPLICATION_ID` in `api/.env`. Register the command tree with `pnpm discord:register`.
- **Market prices** — `src/routes/market.ts` proxies the WynnVentory API. The single site-wide `WYNNVENTORY_API_KEY` is injected server-side (`src/services/wynnventory.ts`) and never reaches the browser; responses are cached in a Postgres TTL table (`src/services/market-cache.ts`). These routes are **same-origin only** (no scope, ride the `/v1/*` CORS lock) and deliberately not part of the public key system, per WynnVentory's terms. The pure frontend logic is in `app/lib/market/` (price summarization, build cost, emerald/powder formatting) with `app/composables/useMarket.ts`; any surface that renders prices shows a "Powered by WynnVentory" attribution.

### Design tokens

Defined in `app/assets/css/global.css` as Tailwind `@theme` variables; the full system is documented in `DESIGN.md`. The palette is cool graphite (OKLCH hue 265, a near-neutral blue-grey) with a single electric-blue accent (hue 245) — the old copper/green palette is dead. The system is themeable from the tokens up: Dark (default), Midnight, and Light all re-point the same `--color-*` names, so components stay theme-agnostic — never hardcode an `oklch(...)` neutral or accent in a component. Use semantic token names (`bg`, `surface`, `surface-hi`, `border`, `faint`, `muted`, `text`, `accent`). Section and panel headers use the shared `@utility kicker` (mono, uppercase, tracked) — consume it, don't redefine it per component. The in-game item tooltips are a sealed "walled garden": pixel fonts, hardcoded rarity hex, and a `#0d0d0d` ground live only inside the tooltip; the `--color-*` tokens and UI fonts stay out, and the tooltip styles never leak into the chrome. All seven self-hosted Wynncraft fonts (`wynn-ascii`, `wynn-common`, `wynn-default`, `wynn-five`, `wynn-wynnic`, `wynn-high-gavelian`, `wynn-old-fruman`) are available for in-game text rendering; `wynn-common` holds the elemental/combat icon glyphs.

### Runtime config

Two public runtime config values (overridable via env vars):

- `NUXT_PUBLIC_CDN_BASE_URL` — game data CDN root (default: `https://cdn.wynn.tools/`); `versions.json` lives at the root, snapshots under `data/{gameVersion}/`
- `NUXT_PUBLIC_ATHENA_URL` — live game data API, also serves static map data (default: `https://athena.wynntils.com`)
- `NUXT_PUBLIC_API_BASE_URL` — accounts/sharing + market-price backend, the `api/` package in this repo (default: `https://api.wynn.tools`)

The backend's own env is Zod-validated in `api/src/env.ts` (`DATABASE_URL`, `DISCORD_*`, `FRONTEND_URL`, `COOKIE_DOMAIN`, `WYNNVENTORY_API_KEY`, …); see `api/.env.example`.

### Testing

Two suites. **Frontend:** tests live alongside source (e.g. `lib/math/dps.test.ts`), Vitest node env, alias `~` → `app/`; everything under `lib/` is a pure unit test with no DOM or Vue. The convention is logic-in-`lib/` (unit-tested) with thin components verified by `pnpm lint && pnpm build` — there is no component-render test setup. **Backend:** tests in `api/test/` run against a real Postgres on `:5433` (`cd api && pnpm db:test:up`), migrated fresh per run; the upstream WynnVentory/Discord clients are fetch-injectable so they stub without network.
