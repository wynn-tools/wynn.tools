# wynn.tools — Feature Specification

## What is wynn.tools

A unified web platform for the Wynncraft community that consolidates the tools players already use — WynnBuilder, the interactive map, crafting — and adds a sharing layer that gives community content (builds, lootruns, info box scripts) a permanent, linkable, embeddable home on the web.

The existing WynnBuilder is excellent. The map in wynntils-web is excellent. The problem is they exist in isolation with no sharing infrastructure: build links are 300-character base64 blobs, lootrun files live in Discord attachments, info box scripts exist as copy-paste walls in forum threads. This site fixes that layer without replacing the tools themselves.

---

## Design Principles

**No upvoting.** Wynncraft changes constantly. A build or lootrun that was best-in-slot six months ago may be broken today. Upvote counts freeze at the moment of peak popularity and mislead users forever after. Curation by named, accountable people is the only sustainable quality signal.

**Short URLs and embeds everywhere.** Every shareable object gets a short URL (e.g. `wynn.tools/b/x7k2`) and a rich OG card so Discord and Twitter previews show actual content — class, key stats, item names — not a blank link.

**Curators, not crowds.** Surfacing good builds and lootruns is a human editorial problem, not an algorithm problem. The platform provides tools for trusted curators (like Blue's Builds) to annotate, organise, and present content with the context it needs.

**Discord as the forum.** The Wynncraft community lives in Discord. Rather than building a competing forum, threads and discussion belong there. The platform can mirror content from designated Discord channels rather than trying to replace them.

---

## Surface Map

```
wynn.tools/
├── builder/          WynnBuilder — build calculator
├── map/              Interactive world map
├── crafter/          WynnCrafter — crafting calculator
├── atlas/            WynnAtlas — item search
├── b/[id]            Shared build (short URL)
├── l/[id]            Shared lootrun (short URL)
├── s/[id]            Shared info box script (short URL)
└── c/[slug]          Curated collection (Blue's Builds style)
```

---

## 1. Core Tools (Ported from WynnBuilder)

### What transfers

The calculation engine, encoding format, item database, and all game logic are carried over entirely unchanged as plain JS modules. No rewrite. They live in `lib/` and are framework-agnostic.

The tools gain from the port:

- Proper routing and navigation between tools instead of separate HTML files
- SSR-generated OG cards when a build or crafter link is shared
- Shared auth session with Wynntils account (optional, for saving builds)
- Build saving: short URLs instead of base64 URL hashes

### Build saving

Authenticated users (Wynntils account via Athena) can save a build with a name and optional description. The system issues a short ID. Unauthenticated users get a short URL backed by an anonymous session — no account required to share a link.

Saved builds are immutable snapshots. Editing creates a new version. Old links never break.

---

## 2. Interactive Map

Ported from wynntils-web. The existing implementation is feature-complete.

Additions specific to wynn.tools:

- **Lootrun overlay** — when viewing a shared lootrun (`/l/[id]`), the map opens with the route pre-loaded and highlighted
- **Deep links from builder** — item slot tooltips can link to the map showing where an ingredient or item is found
- **Coordinate permalinks** — shareable links to a specific map position and zoom level

---

## 3. Lootrun Sharing

### The problem

Lootruns are routes players run repeatedly to farm loot. A good lootrun is a significant community asset — but currently they live as attached files in Discord messages, with no preview, no metadata, and no way to see what you're downloading before you import it.

### Shared lootrun object

```
id          short ID (e.g. "x7k2")
name        display name
author      Wynntils account or anonymous attribution string
version     Wynncraft version this was made on (e.g. "2.1.7.0")
created_at  timestamp
notes       markdown, optional — describe the route, key stops, tips
route       the lootrun data (existing Wynntils lootrun format)
```

The `version` field is surfaced prominently on the share page and in embeds. This is how users know if a lootrun is likely outdated — not through votes, but through the version it was created on versus the current game version.

### Share page (`/l/[id]`)

- Map view with the route drawn on it
- Metadata: author, Wynncraft version, creation date, notes (rendered markdown)
- "Open in Map" button — loads the route in the full map interface
- "Copy to game" button — copies the route data in the format Wynntils expects
- Version warning banner if the lootrun was made on an older game version

### OG embed

Discord/Twitter preview card shows:

- Lootrun name
- Author
- A static thumbnail of the route drawn on the map (generated server-side)
- Wynncraft version

---

## 4. Info Box Script Sharing

### The problem

Wynntils has an info box scripting system where players write expression templates to display custom overlays in-game (XP rates, skill tracking, timers, etc.). Good scripts spread via Discord as copy-paste walls of text with no syntax highlighting, no preview, no version context, and no stable URL.

Example of what a shared script currently looks like in Discord:

```
{with_font(styled_text(concat(
    "&#00ffaaffLevel "; str(level); " ("; str(round(xp_pct; 2)); "%)";
    "\n&#00ffffff"; xp; " / "; xp_req;
    "\n&#00aaffff+"; xpm; "/min | +"; str(round(mul(div(xpm_raw; xp_req_raw); 100); 2)); "%/min"
)); "language/five")}
```

### Shared script object

```
id            short ID
title         display name (e.g. "XP Rate Display")
author        Wynntils account or attribution string
created_at    timestamp
description   markdown — what the script does, any setup required
components    array of named components, each with:
  label         e.g. "Info Box Content (fancy_text font)"
  type          "infobox" | "bar_color" | "bar_value" | "enabled"
  content       the expression string
```

### Share page (`/s/[id]`)

- Each component rendered in a code block with syntax highlighting for the Wynntils expression language
- Description rendered as markdown
- Screenshot or GIF attached by author showing the overlay in-game (optional upload)
- "Copy component" button per component — one click to copy the expression string
- "View raw" — the full script as a plain text file
- Compatible Wynntils version noted if known

### OG embed

Discord/Twitter preview card shows:

- Script title
- Author
- Description excerpt
- Number of components
- In-game screenshot thumbnail if one was uploaded

### No execution, no validation

The platform stores and displays scripts verbatim. It does not attempt to parse or validate expressions server-side. The Wynntils client is the runtime.

---

## 5. Build Sharing & Curation

### What this is not

Not a voting gallery. Not a ranked list. Not a recommendation feed. The community has identified clearly that upvote-based build databases (see: Nori's public build gallery) become misleading quickly because the game changes and votes don't decay.

### What this is

A platform for **curators** to publish and maintain **collections** — named sets of builds with substantial written context, maintained by accountable people.

### Shared build object

```
id          short ID
name        display name
class       Warrior / Mage / Archer / etc.
level       combat level
hash        the WynnBuilder encode string (the actual build)
version     Wynncraft version the build was made on
author      Wynntils account or attribution
created_at
updated_at  builds can be updated in place (unlike lootruns)
notes       markdown — playstyle, gear substitutions, ability tree reasoning
tags        e.g. ["melee", "solo", "dungeon"]
```

### Share page (`/b/[id]`)

- Full build stats rendered server-side: damage, EHP, skill points, spell costs — the same output WynnBuilder shows
- "Open in Builder" — loads the build in the full interactive builder
- Author name and date, version tag with warning if outdated
- Notes rendered as markdown (this is where "thousands of characters of context" lives)
- If the build belongs to a collection, breadcrumb back to it

### OG embed

Discord/Twitter preview card shows:

- Build name and class
- Key stats: DPS, EHP, level requirement
- Item names (weapon + armour)
- Author

### Collections (`/c/[slug]`)

A collection is a curator's named grouping of builds with its own page. Example: `wynn.tools/c/blues-builds`.

```
slug        URL-friendly identifier
title       e.g. "Blue's Builds"
curator     Wynntils account
description markdown — overall context, what to expect, how to read these builds
builds      ordered list of build IDs with per-entry curatorial notes
updated_at
```

Collections are owned and maintained by their curator. Only the curator (or an admin) can add, remove, or reorder builds within their collection.

There is no algorithmic discovery. Collections are found through links — shared in Discord, linked from the Wynntils website, mentioned in community guides. The platform does not surface a "popular collections" feed.

### Discord mirroring (future)

The design explicitly anticipates a Discord bot that mirrors content between a designated Discord channel and a collection page. A curator posts a build in Discord; the bot creates the wynn.tools entry and mirrors the thread back. Replies on Discord appear on the site; comments on the site (if implemented) sync back to Discord.

This is a separate system. The platform is designed to support it via a stable API, but the bot itself is out of scope for this spec.

---

## 6. Authentication

Backed by Athena (the Wynntils account system). Users authenticate with their Minecraft/Wynntils account via the existing Athena OAuth flow.

Auth is **optional for consumption** — anyone can view builds, lootruns, and scripts without an account.

Auth is **required for creation** of saved content. Anonymous short URLs are supported for builds only (via the builder's "share" button), but to create a named build, lootrun, or script with a profile attached, a Wynntils account is required.

Curator status is granted manually by admins. Collections can only be created by curators.

---

## 7. Embeds and Short URLs

Every shareable object — build, lootrun, script, collection — gets:

1. A short URL: `wynn.tools/b/[6-char alphanumeric]`
2. OG meta tags with a server-rendered preview image
3. A JSON API endpoint: `wynn.tools/api/b/[id].json`

Preview images are generated server-side at share time (or on first request) using a headless renderer. They are static images served from a CDN — not dynamically generated per request.

The short URL format is designed to be typeable and pasteable in Discord without wrapping.

---

## 8. Technical Notes

### Framework

Nuxt 3, consistent with wynntils-web. The builder tools run client-side within `<ClientOnly>` wrappers — no SSR for the interactive computation, but SSR for share pages so embeds work.

### Builder computation engine

The WynnBuilder JS modules (`computation_graph.js`, `damage_calc.js`, `build_encode_decode.js`, etc.) are carried over as plain JS files in `lib/`. They are not rewritten. The encode/decode format is unchanged — existing shared links remain valid.

### Data

Game data JSON files (items, ingredients, atree constants, aspects) are served as static assets, consistent with how WynnBuilder currently operates. The update workflow (regenerate on each game patch, commit) remains the same.

### Backend

New persistence endpoints needed on Athena (or a lightweight companion service):

```
POST   /builds              save a build, return short ID
GET    /builds/:id          fetch build metadata + hash
POST   /lootruns            save a lootrun
GET    /lootruns/:id        fetch lootrun
POST   /scripts             save an info box script
GET    /scripts/:id         fetch script
POST   /collections         create a collection (curators only)
PUT    /collections/:slug   update a collection
GET    /collections/:slug   fetch collection with builds
```

### Version staleness

Every piece of community content stores the Wynncraft version string it was created on (e.g. `2.1.7.0`). The platform knows the current version from Athena's version endpoint. If the stored version is older than current, a staleness warning is shown. This is a display flag only — the content is never hidden or demoted.

---

## Out of Scope

- **Upvoting or any crowd ranking** — explicitly rejected
- **Comments on build pages** — defer to Discord mirroring approach
- **Build optimiser / search** — `nori.fish` already does this; wynn.tools is for human-curated content, not algorithmic matching
- **In-browser lootrun editor** — out of scope for v1; the Wynntils client is the editor
- **Expression language validator** — the Wynntils client is the runtime; server-side validation is not feasible
