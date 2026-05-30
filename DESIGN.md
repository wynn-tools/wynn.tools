---
name: wynn.tools
description: Open-source Wynncraft tool hub — builder, map, and community data in one place.
colors:
  bg: "oklch(16% 0.008 265)"
  surface: "oklch(21% 0.01 265)"
  surface-hi: "oklch(26% 0.012 265)"
  border: "oklch(40% 0.014 265)"
  faint: "oklch(62% 0.014 265)"
  muted: "oklch(72% 0.012 265)"
  text: "oklch(95% 0.004 265)"
  accent: "oklch(68% 0.16 245)"
  accent-dim: "oklch(56% 0.13 245)"
  accent-glow: "oklch(68% 0.16 245 / 0.15)"
  gold: "oklch(78% 0.14 75)"
  gold-dim: "oklch(62% 0.11 75)"
  elem-earth: "oklch(72% 0.18 145)"
  elem-thunder: "oklch(82% 0.15 95)"
  elem-water: "oklch(75% 0.13 215)"
  elem-fire: "oklch(68% 0.18 35)"
  elem-air: "oklch(85% 0.04 250)"
typography:
  display:
    fontFamily: "'Barlow Semi Condensed', system-ui, sans-serif"
    fontSize: "clamp(48px, 9vw, 96px)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Barlow Semi Condensed', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Barlow Semi Condensed', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Figtree', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontFamily: "'Figtree', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "'Geist Mono', 'Courier New', monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.1em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "40px"
components:
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  nav-link-active:
    backgroundColor: "oklch(68% 0.16 245 / 0.08)"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "5px"
    padding: "6px 14px"
  tab-active:
    backgroundColor: "oklch(68% 0.16 245 / 0.08)"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "5px"
    padding: "6px 14px"
  filter-chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  filter-chip-active:
    backgroundColor: "oklch(68% 0.16 245 / 0.08)"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  input-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "20px"
  page-cta:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
---

# Design System: wynn.tools

## 1. Overview

**Creative North Star: "The Cold Forge"**

wynn.tools is a precision instrument cooled to working temperature. The visual language is graphite under arc light: a dark, cool-cast ground (OKLCH hue 265, a near-neutral blue-grey) crossed by a single electric-blue accent (hue 245) that reads as cold light, not heat. Where the old system glowed copper like metal in a hearth, this one glows like a weld arc or an instrument LED: the readiness signal of a tool that has been calibrated rather than decorated. The system never ornaments; it indexes.

The display face is condensed and heavy (Barlow Semi Condensed, 600 minimum) because players parse stat tables and item names at speed. Section labels, counts, coordinates, and the logo itself are set in Geist Mono to mark them as system output rather than marketing voice. Body copy is Figtree: clean and legible without performing friendliness. Density is deliberate. Wynncraft endgame players read dense data UIs all day; whitespace here is earned by content, not distributed by reflex. The system is themeable from the ground up: every surface, tint, and glow resolves through `--color-*` tokens, so the same instrument re-lights cleanly across Dark (default), Midnight (OLED near-black), and Light without any component knowing which theme is active.

What this system refuses: RPG fantasy aesthetics (parchment, medieval ornament, pixel art), crypto-era maximalism (neon halos, blurry hero gradients, hype copy), and generic SaaS calm (orbital glows, rounded-everything, identical feature-icon grids). This is built by players with hundreds of hours in the endgame, and it should read like it: the work of someone with a GitHub account, not a design agency.

**Key Characteristics:**

- Cool graphite ground, electric-blue light — near-neutral hue-265 surfaces; one blue accent (hue 245) is the only color that truly illuminates
- Token-driven theming — Dark / Midnight / Light all re-point the same `--color-*` names; components stay theme-agnostic
- Condensed display weight over humanist body — authority and legibility at different scales
- Mono for system output — counts, coordinates, section kickers, the logo: anything that reads as the machine talking
- Flat at rest, blue glow on state change — depth is thermal and electric, never structural shadow at rest
- Gold quarantined to the game world — item rarities and stat highlights only, never UI chrome

## 2. Colors: The Cold Forge Palette

Restrained palette. One chromatic accent (Arc Blue) carries every interactive state across all three themes. Gold is reserved for game-world context only. Element hues appear exclusively on Wynncraft's elemental glyphs. Everything else is a cool, near-neutral grey tinted toward hue 265.

### Primary

- **Arc Blue** (`oklch(68% 0.16 245)`): The sole interactive accent. Active nav links, focused inputs, selected tabs and filter chips, the logo dot, the arrow on a hovered tool row, focus rings. Its scarcity is the signal: when Arc Blue appears, something is actionable or selected. In Light it deepens to `oklch(56% 0.18 245)` for contrast on white; in Midnight it brightens slightly to `oklch(70% 0.16 245)`.
- **Arc Blue Dim** (`oklch(56% 0.13 245)`): Lower-energy accent. World-event map markers, secondary glow halos, accent states that must sit behind the primary signal.

### Secondary

- **Ingot Gold** (`oklch(78% 0.14 75)`): Game-world semantic only. Item rarities, stat highlights, and the legacy `--color-copper` alias that older builder components still read. Never used for UI interaction. In Light it darkens to `oklch(58% 0.13 75)` so rarities stay legible on a white ground.
- **Dim Gold** (`oklch(62% 0.11 75)`): Subdued gold for secondary game-world context.

### Tertiary

The five element hues are game-data semantics, not a UI palette. They color Wynncraft's elemental glyphs and nothing else.

- **Earth** (`oklch(72% 0.18 145)`) · **Thunder** (`oklch(82% 0.15 95)`) · **Water** (`oklch(75% 0.13 215)`) · **Fire** (`oklch(68% 0.18 35)`) · **Air** (`oklch(85% 0.04 250)`).

### Neutral

The graphite scale. Every step is tinted toward hue 265 (chroma 0.004–0.014). Values below are the Dark default; Midnight and Light re-point the same token names.

- **Graphite Ground** (`oklch(16% 0.008 265)`): Page background. Cool near-black; never pure black.
- **Graphite Surface** (`oklch(21% 0.01 265)`): Card and panel surfaces, one step above the ground. Also aliased as `--color-card`.
- **Graphite Lift** (`oklch(26% 0.012 265)`): Elevated surfaces — cards on hover, top-layer panels, dropdown rows. Aliased as `--color-card-hover`.
- **Seam** (`oklch(40% 0.014 265)`): Borders and dividers. Marks a boundary without demanding attention.
- **Faint** (`oklch(62% 0.014 265)`): Deeply muted text — descriptions inside dropdowns, chevrons, footnote-grade labels.
- **Muted** (`oklch(72% 0.012 265)`): Secondary text. Nav links at rest, filter labels, descriptions, tab labels at rest.
- **Off-White** (`oklch(95% 0.004 265)`): Primary text. Cool-tinted, never pure white, to prevent glare on the dark ground.

### Named Rules

**The One Arc Rule.** Arc Blue appears on ≤15% of any given screen. Its presence means interactive or selected. Using it as a decorative fill collapses the signal. When in doubt, use Muted and let the blue arrive on hover or focus.

**The No-Pure-Black/White Rule.** `#000` and `#fff` are forbidden in every theme. Each neutral is tinted toward hue 265 (chroma 0.004–0.014). The Dark floor is Graphite Ground; the ceiling is Off-White.

**The Gold Quarantine Rule.** Ingot Gold is game-world only. It does not appear on buttons, links, focus rings, or any UI element. It is Wynncraft's economy leaking into the content, not the chrome imitating it. The same quarantine applies to the five element hues and to the eight in-game tooltip rarity colors (see Components).

**The Walled-Garden Rule.** The in-game tooltips are a sealed surface. Their pixel fonts, pure `#0d0d0d` ground, hardcoded rarity hex, and `image-rendering: pixelated` live only inside the tooltip and never leak into the chrome; conversely, the `--color-*` tokens, Figtree/Barlow type, and theme system never reach inside the tooltip. The boundary is the point.

**The Token-Resolved Rule.** Never hardcode a neutral or accent value in a component. Reference `--color-*` so the element re-tints across Dark, Midnight, and Light. A literal `oklch(...)` neutral baked into a component is a theming bug.

## 3. Typography

**Display Font:** Barlow Semi Condensed (with `system-ui, sans-serif` fallback)
**Body Font:** Figtree (with `system-ui, sans-serif` fallback)
**Label/Mono Font:** Geist Mono (with `'Courier New', monospace` fallback)

**Character:** Barlow's condensed heavy weights read like a tool's nameplate, industrial and authoritative. Figtree is warm and open at body size without signaling "friendly app." Geist Mono marks system output: kickers, counts, coordinates, and the logo all carry a terminal reading.

### Hierarchy

- **Display** (800 weight, `clamp(48px, 9vw, 96px)`, line-height 1, tracking -0.03em): Hero page title only — the logo rendered large.
- **Headline** (700 weight, 16px, line-height 1.1, tracking -0.01em): Panel headings, tool-row names, section titles.
- **Title** (600 weight, 14px, line-height 1.1, tracking -0.01em): Subheadings, upcoming-feature names, in-panel labels.
- **Body** (400 weight, 15px, line-height 1.6): Page body copy and descriptions. Cap line length at 65ch.
- **Small** (400 weight, 13px, line-height 1.4): Card and row descriptions, filter labels, secondary content.
- **Label** (500 weight, 11px, tracking 0.1em, uppercase): Section kickers, group rules, counts, CTA text, footer copy. Always mono. Implemented once as the `kicker` utility — consume it, don't redefine per component.

### Named Rules

**The Mono-for-System Rule.** Any text that reads as output from the system rather than communication to the user — counts, coordinates, section kickers, the logo — uses Geist Mono. Prose uses Figtree. Headings use Barlow Semi Condensed. These roles do not cross.

**The No-Decorative-Type Rule.** Barlow Semi Condensed ships at 600 minimum, 700–800 preferred. A condensed face at 300 weight is aesthetically incoherent with this system.

## 4. Elevation

This system is flat by default. Depth is not structural; it is thermal and electric. Surfaces cast no ambient shadow at rest. When an element becomes interactive or floats, it illuminates with Arc Blue rather than lifting.

Depth is expressed two ways: (1) **tonal stepping** through the graphite scale (bg → surface → surface-hi), which separates layers without casting light; (2) **Arc Blue glow halos** on interactive state (hover, focus, active), signaling readiness through cold light. The only structural shadows belong to genuinely floating elements — nav dropdowns, map filter panels, search results, mobile sheets — which pair `box-shadow: 0 4px 24px oklch(0% 0 0 / 0.3)` with `backdrop-filter: blur(12px)` over a `--color-*` surface at 92–97% opacity. These read as atmosphere, not architecture.

### Shadow Vocabulary

- **Glow-sm** (`0 0 16px color-mix(in oklch, var(--color-accent) 18%, transparent)`): Small accent-element attention. The `shadow-accent-sm` utility.
- **Glow-md** (`0 0 32px color-mix(in oklch, var(--color-accent) 28%, transparent)`): Focus halos on elevated interactive elements. The `shadow-accent-md` utility.
- **Glow-lg** (`0 0 56px color-mix(in oklch, var(--color-accent) 40%, transparent)`): High-emphasis selected or featured state. The `shadow-accent-lg` utility.
- **Float** (`0 4px 24px oklch(0% 0 0 / 0.3)`): Structural float for dropdowns, popovers, and panels, always paired with backdrop-blur and an accent/20 ring.

### Named Rules

**The Flat-By-Default Rule.** No element casts a shadow at rest. Shadows and glows are state responses — hover, focus, float — only. A surface that glows at rest is broken.

**The No-Lift Rule.** `transform: translateY(-Xpx)` is forbidden on hover for panels, cards, and rows. The permitted exception is a horizontal nudge (`translateX(3px)`) on a chevron or arrow.

## 5. Components

### Navigation

Sticky, 52px tall, `--color-bg` at 92% opacity with 12px backdrop-blur and a 1px Seam bottom border. Logo in Geist Mono (14px, weight 500, tracking -0.02em) with the dot in Arc Blue; the whole logo shifts to Arc Blue on hover. Nav links: Muted at rest, Off-White on hover (background steps to Graphite Surface), Arc Blue with accent/8% background when active (`router-link-active`). Radius 6px, padding 6px 12px, 0.12s ease-out on color and background. Build/Craft are hover dropdowns: a floating panel with an accent/20 ring, blur, and Float shadow, each row carrying a name plus a Faint description. Focus ring: 2px Arc Blue, 2px offset. Mobile (≤720px): desktop tools collapse into a hamburger-triggered sheet with 44px touch targets and mono section labels.

### Pill Tabs (`.tabs`)

The canonical segmented control for builder panels (element tabs, powder tabs). An inline flex strip, 3px padding, Graphite Surface background, 1px Seam border, 8px radius, horizontally scrollable with hidden scrollbar. Each button is mono uppercase (600, 12px, tracking 0.08em), 5px radius, Muted at rest, Off-White on hover, Arc Blue with accent/8% background when `.on`. This is the single source of truth for tabbed navigation — do not hand-roll alternates.

### Filter Kit (`.f-group`, `.f-input`, `.f-slider`)

The item/search filtering primitives. Filter chips: transparent with a 1px Seam border, 4px radius, Muted text; hover lifts text to Off-White and border to Faint; `.on` switches to Arc Blue text, Arc Blue border, accent/8% background. Text input (`.f-input`): Graphite Surface, 1px Seam border, 6px radius; focus drops the outline and shifts the border to Arc Blue. Range slider (`.f-slider`): 4px Seam track, range fill in accent/70%, a 14px thumb with a 60%-accent border on a `--color-bg` fill; focus draws a 2px accent/50% ring. Legends and group labels use the mono label role. On ≤720px, controls grow to ≥34–40px touch targets and the slider thumb grows to 20px.

### Tool Rows (landing)

The landing page lists tools as borderless **rows**, not boxed cards: a leading 16px icon, a Headline-weight name, a Body-small description, and a trailing `→` arrow, separated by 1px Seam dividers and grouped under mono `group-rule` labels. On hover the name, icon, and arrow all shift to Arc Blue and the arrow nudges right. No surface fill, no border box, no lift. This row pattern is deliberate; do not regress it into an identical icon-heading-text card grid.

### Cards / Containers

When a true card is needed (result cards, panels), use Graphite Surface on the ground, an 8px radius, a 1px Seam border, and 20px internal padding. Hover steps the surface to Graphite Lift. Flat at rest per the Elevation rules — no resting shadow, no translateY. Nested cards are prohibited.

### Floating Panels

All floating UI — nav dropdowns, map filter panels, search results, popovers — shares one pattern: a `--color-*` surface at 92–97% opacity, 12px backdrop-blur, an accent/20 ring, 8px radius (16px top-only for mobile bottom sheets), and the Float shadow. They exist within their environment, not stacked above it.

### In-Game Tooltips (signature)

The one place the design system stops at the door. `Item`, `Build`, `Charm`, `Ingredient`, `Material`, and `Tome` tooltips are pixel-faithful recreations of Wynncraft's own item cards: the game world rendered inside the tool, not the tool's chrome dressed up as the game. Everything the rest of the system forbids is deliberate here.

- **Type:** the Wynncraft pixel fonts (`wynncraft` primary; `wynn-five`/`wynn-default`/`wynn-ascii`/`wynn-common`/`wynn-wynnic`/`wynn-high-gavelian`/`wynn-old-fruman` for styled name, tag, and lore segments), `letter-spacing: -1px`, large absolute sizes (name 28px, DPS 34px, body 18px) with a `3px 3px` hard text-shadow. None of the UI type roles apply.
- **Ground:** a pure near-black `#0d0d0d` gradient into a per-rarity tint, not the hue-265 graphite tokens. `image-rendering: pixelated` on every sprite, icon, frame, and mask.
- **Frame:** a pixel-art `border-image` per rarity (`borderImage: url(frame) 25 10 / 8 3`), with a 2px solid rarity-color fallback. Higher rarities inset the body with wider margins, exactly as in-game.
- **Rarity palette (game-world only):** Normal `#ffffff`, Unique `#ffff55`, Rare `#ff55ff`, Legendary `#55ffff`, Fabled `#ff5555`, Mythic `#c80db1`, Set `#55ff55`, Crafted `#00bcd4`. Each carries a name color, a lighter accent (DPS / separators / tags), and a background tint. Identification values use good-green `#83f7c6` and bad-red `#f78383`.
- **Anatomy:** rarity-framed header (emblem + sprite + name + tags), weapon DPS / attack-speed / elemental damage or armour health / elemental defences, mask-image separators, skill-point requirement discs, class and combat-level rows, a min↔max identification grid, major IDs, powder slots, and styled lore. Scales the whole hierarchy down under 480px while keeping the frame intact.
- **Theme-independent:** these render identically across Dark, Midnight, and Light. They are the game world, which has no theme.

### Theme Picker

A trailing nav control opening a small panel of four swatches (System / Light / Dark / Midnight). Each swatch previews that theme's ground, panel, and Arc Blue accent as live OKLCH chips; System shows a split ground/light preview. The picker writes `html[data-theme]`; a pre-paint script sets the attribute before first paint to avoid a flash.

### Wynnic Decoration

Wynncraft's Wynnic script (`font-family: 'wynn-wynnic'`) as background texture only, on the hero section. Opacity ≤0.05, Arc Blue, `pointer-events: none`. It never carries meaning; it is the game's own glyph system used as atmospheric fill, and it earns its place exactly once per page.

## 6. Do's and Don'ts

### Do:

- **Do** tint every neutral toward hue 265 and resolve it through a `--color-*` token so it re-tints across Dark, Midnight, and Light.
- **Do** use Arc Blue only on interactive, selected, or focused elements (≤15% of a screen). If it appears decoratively at rest, remove it.
- **Do** use Geist Mono for anything that reads as system output: counts, coordinates, section kickers, group rules, the logo.
- **Do** use Barlow Semi Condensed at weight 600 minimum, 700–800 for hero and headings.
- **Do** cap body line length at 65ch. Dense data UI does not mean dense reading columns.
- **Do** reach for `.tabs`, `.f-group`, `.f-input`, `.f-slider`, and the `kicker` utility before hand-rolling a new variant of a control that already exists.
- **Do** use backdrop-blur + a `--color-*` surface at 92–97% opacity with an accent/20 ring for every floating panel. They live in their environment, not above it.
- **Do** transition colors and background at 0.12–0.15s ease-out. Faster reads as broken; slower reads as laggy.
- **Do** keep Wynnic decoration to the hero at ≤5% opacity.
- **Do** keep the in-game tooltips sealed: pixel fonts, pure `#0d0d0d` ground, per-rarity hex, and pixelated rendering stay inside the tooltip and render identically across all three themes.
- **Do** put a 2px solid Arc Blue focus ring with 2px offset on every interactive element, and kill all motion under `prefers-reduced-motion: reduce`.

### Don't:

- **Don't** use `#000` or `#fff` in any theme. Pure black or white reads immediately as foreign on a hue-265 ground.
- **Don't** hardcode a neutral or accent `oklch(...)` value in a component. That breaks theming — reference the token.
- **Don't** use Ingot Gold or the element hues on UI chrome. They are game-world semantics — item rarities, stat highlights, elemental glyphs — never buttons, links, or focus rings.
- **Don't** use a `border-left` (or `border-right`) greater than 1px as a colored accent stripe on cards, rows, or callouts. Use full borders, background tints, or leading icons.
- **Don't** use gradient text (`background-clip: text` with a gradient). Use solid Arc Blue; emphasize with weight or size.
- **Don't** use glassmorphism decoratively. Backdrop-blur is structural — it belongs to floating panels in a layered environment, not to flat surfaces.
- **Don't** use the hero-metric template (big number, small label, gradient accent). That is SaaS cliché territory.
- **Don't** rebuild the landing tool rows as an identical icon-heading-text card grid. The borderless row with a trailing arrow is intentional.
- **Don't** let the in-game tooltip aesthetic leak into the chrome (pixel fonts, `#0d0d0d`, rarity hex, pixelated edges) or apply `--color-*` tokens, the UI fonts, or the theme system inside a tooltip. The Walled-Garden boundary runs both ways.
- **Don't** add parchment textures, medieval ornament, pixel art fonts, or anything that says "this is a game" instead of "this is a tool." That is the hppeng-wynn / WynnData aesthetic this project replaces.
- **Don't** use crypto/NFT visual language: neon on black, blurry hero gradients, vague hype copy ("the future of X"), orbital glows.
- **Don't** use generic SaaS landing patterns: "Ship faster" headlines, three-card feature rows, frosted-glass hero panels.
- **Don't** apply `transform: translateY(-Xpx)` to cards or rows on hover. A horizontal nudge on a chevron or arrow is the only permitted movement.
- **Don't** let any surface cast a shadow or glow at rest. Shadows and glows are state responses — hover, focus, float — not decoration.
