---
name: wynn.tools
description: Open-source Wynncraft tool hub — builder, map, and community data in one place.
colors:
  bg: "oklch(14% 0.006 30)"
  surface: "oklch(19% 0.008 30)"
  surface-hi: "oklch(24% 0.009 30)"
  border: "oklch(26% 0.008 30)"
  faint: "oklch(36% 0.007 30)"
  muted: "oklch(58% 0.008 30)"
  text: "oklch(92% 0.004 30)"
  accent: "oklch(65% 0.15 48)"
  accent-dim: "oklch(52% 0.12 48)"
  accent-glow: "oklch(65% 0.15 48 / 0.15)"
  gold: "oklch(78% 0.14 75)"
  gold-dim: "oklch(62% 0.11 75)"
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
  label:
    fontFamily: "'Geist Mono', 'Courier New', monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.1em"
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
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "12px"
  md: "20px"
  lg: "40px"
  xl: "64px"
components:
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  nav-link-active:
    backgroundColor: "oklch(65% 0.15 48 / 0.08)"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  button-map-ctrl:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  button-map-ctrl-active:
    backgroundColor: "oklch(65% 0.15 48 / 0.05)"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  card-tool:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input-search:
    backgroundColor: "oklch(14% 0.006 30 / 0.9)"
    textColor: "{colors.accent}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
---

# Design System: wynn.tools

## 1. Overview

**Creative North Star: "The Forge Log"**

wynn.tools is a craftsman's logbook — dense, purposeful, made by someone who actually uses the tools they're documenting. The visual language starts from worn copper resting on carbon steel: a dark, near-black ground with a very slight warm cast (hue 30, barely perceptible), crossed by copper-bronze accents that light up under interaction like metal in firelight. The system never decorates; it indexes.

The display font is condensed and heavy — Barlow Semi Condensed at high weight — because players read stat tables and item names fast. The logo and section labels use monospace to mark them as system output, not marketing. Body text is Figtree: clean, warm, readable without trying to be friendly. The overall density is deliberate: Wynncraft endgame players are used to parsing dense data UIs. White space is earned by content, not distributed by default.

What this system refuses: RPG fantasy aesthetics (parchment, medieval ornament, pixel art), crypto-era maximalism (neon halos, blurry hero gradients, hype copy), and generic SaaS calm (orbital glows, rounded-everything, feature-icon grids). This is built by players with 400 hours in-game — it should feel like it.

**Key Characteristics:**

- Dark ground, copper light — near-black warm surfaces; copper accent is the only color that truly illuminates
- Condensed display weight paired with humanist body — authority and legibility at different scales
- Monospace for system labels — timestamps, counts, the logo itself: anything that reads as output
- No decorative elements except Wynnic script — the only permitted ornament is the game's own glyph system, used as texture at very low opacity
- Flat at rest, glow halos on state change — depth is not structural; it's thermal

## 2. Colors: The Forge Palette

Restrained palette. One chromatic accent (Forge Copper) carries all interactive state. Gold is reserved for game-world context only — item rarities, stat highlights. Everything else is neutral.

### Primary

- **Forge Copper** (`oklch(65% 0.15 48)`): The sole interactive accent. Used on active nav links, card hover borders, focused inputs, icon backgrounds, and the logo dot. Its rarity is the point — when it appears, something is actionable or selected.
- **Deep Copper** (`oklch(52% 0.12 48)`): Hover border state on tool cards. Slightly darker than Forge Copper to create depth without increasing chroma.

### Secondary

- **Ingot Gold** (`oklch(78% 0.14 75)`): Game-world semantic only. Item rarities, stat highlights, the legacy `--color-copper` alias in older builder components. Never used for UI interaction.
- **Dim Gold** (`oklch(62% 0.11 75)`): Subdued gold for secondary game-world context.

### Neutral

- **Carbon Hearth** (`oklch(14% 0.006 30)`): Page background. Near-black with a barely-perceptible warm undertone (hue 30, chroma 0.006). Never pure black.
- **Aged Iron** (`oklch(19% 0.008 30)`): Card and panel surfaces. One step above the background.
- **Iron Lift** (`oklch(24% 0.009 30)`): Elevated surfaces — cards on hover, top-layer map panels.
- **Forge Seam** (`oklch(26% 0.008 30)`): Borders and dividers. Subtle enough to mark a boundary without demanding attention.
- **Ash** (`oklch(36% 0.007 30)`): Deeply muted text and decorative icons. Section counters, zoom-gated labels, footer copy.
- **Steel Mist** (`oklch(58% 0.008 30)`): Secondary text — descriptions, nav link labels at rest, category names in filter lists.
- **Off-White Steel** (`oklch(92% 0.004 30)`): Primary text. Not pure white — a warm tint prevents glare on the dark ground.

### Named Rules

**The One Ember Rule.** Forge Copper appears on ≤15% of any given screen. Its presence means something is interactive or selected. Using it as a decorative fill collapses the signal. When in doubt, use Steel Mist and let the copper appear on hover.

**The No-Pure-Black Rule.** `#000` and `#fff` are forbidden. Every neutral is tinted toward hue 30 (chroma 0.005–0.009). The floor is Carbon Hearth; the ceiling is Off-White Steel.

**The Gold Quarantine Rule.** Ingot Gold is game-world only. It does not appear on buttons, links, focus rings, or any UI element. It is Wynncraft's economy leaking into the chrome, not the chrome imitating it.

## 3. Typography

**Display Font:** Barlow Semi Condensed (with `system-ui, sans-serif` fallback)
**Body Font:** Figtree (with `system-ui, sans-serif` fallback)
**Label/Mono Font:** Geist Mono (with `'Courier New', monospace` fallback)

**Character:** Barlow's condensed weight at heavy settings reads like a tool's nameplate — industrial and authoritative. Figtree is warm and open at body size without signaling "friendly app." Geist Mono marks system output: labels, counts, the logo itself carries a terminal reading.

### Hierarchy

- **Display** (800 weight, `clamp(48px, 9vw, 96px)`, line-height 1, tracking -0.03em): Hero page title only. The logo rendered large.
- **Headline** (700 weight, 16px, line-height 1.1, tracking -0.01em): Tool card names, panel headings.
- **Title** (600 weight, 14px, line-height 1.1, tracking -0.01em): Section subheadings, upcoming item names.
- **Body** (400 weight, 15px, line-height 1.6): Page body copy and descriptions. Cap line length at 65ch.
- **Small** (400 weight, 13px, line-height 1.4): Card descriptions, filter labels, secondary content.
- **Label** (500 weight, 11px, tracking 0.1em, `text-transform: uppercase`): Section markers, category headers, footer copy, counts. Always mono.

### Named Rules

**The Mono-for-System Rule.** Any text that reads as output from the system rather than communication to the user — counts, coordinates, section labels, the logo — uses Geist Mono. Prose uses Figtree. Headings use Barlow Semi Condensed. These roles don't cross.

**The No-Decorative-Type Rule.** Barlow Semi Condensed does not appear at low weights. It ships at 600 minimum, 700–800 preferred. A condensed font at 300 weight is aesthetically incoherent with this system.

## 4. Elevation

This system is flat by default. Depth is not structural — it's thermal. Surfaces do not cast ambient shadows at rest. When an element becomes interactive or floated, it illuminates rather than lifts.

Depth is expressed in two ways: (1) **tonal stepping** through the neutral scale (bg → surface → surface-hi), which separates layers without casting light; (2) **copper glow halos** on interactive state (hover, focus, active), which signal readiness through warmth rather than lift.

The only structural shadows are on floating elements — map filter panels, search dropdowns, mobile bottom sheets — which combine `box-shadow: 0 4px 24px oklch(0% 0 0 / 0.3)` with `backdrop-filter: blur(12px)` at bg/90–95% opacity. These read as atmosphere, not architecture.

### Shadow Vocabulary

- **Glow-sm** (`0 0 16px oklch(65% 0.15 48 / 0.18)`): Icon tray hover glow, small accent element attention.
- **Glow-md** (`0 0 32px oklch(65% 0.15 48 / 0.28)`): Focus ring halos on elevated interactive elements.
- **Glow-lg** (`0 0 56px oklch(65% 0.15 48 / 0.40)`): High-emphasis selected state or featured elements.
- **Card hover** (`0 0 0 1px oklch(65% 0.15 48 / 0.12), 0 4px 16px oklch(0% 0 0 / 0.3)`): Tool card on hover — inner accent ring plus depth shadow.
- **Float** (`0 4px 24px oklch(0% 0 0 / 0.3)`): Structural float for panels and dropdowns.

### Named Rules

**The Flat-By-Default Rule.** No element casts a shadow at rest. Shadows and glows are purely state responses — hover, focus, elevation. A surface that glows at rest is broken.

**The No-Lift Rule.** `transform: translateY(-Xpx)` is forbidden on hover for panels and cards. Horizontal nudge (`translateX(3px)` on arrow icons) is the permitted exception.

## 5. Components

### Navigation

Sticky, 52px tall, Aged Iron at 92% opacity with 12px backdrop-blur. One-pixel Forge Seam bottom border. Logo in Geist Mono (14px, weight 500, tracking -0.02em) with the dot in Forge Copper. Nav links: Steel Mist at rest, Off-White Steel on hover (background: Aged Iron), Forge Copper with copper/8% background when active. Radius: 6px. Padding: 6px 12px. Transition: 0.12s ease-out on color and background. Focus ring: 2px Forge Copper, 2px offset.

Mobile: nav items collapse to icon-only (label hidden), horizontal padding drops to 20px.

### Tool Cards (landing page)

Interactive link cards. Aged Iron background, Forge Seam border (1px), 10px radius, 20px internal padding. Minimum height 88px. Icon container: 48×48px, copper/8% background, 8px radius, Forge Copper icon. On hover: surface steps to Iron Lift, border shifts to Deep Copper, inner ring appears (`0 0 0 1px copper/12%`), depth shadow adds (`0 4px 16px black/30%`). Arrow icon nudges 3px right and shifts to Forge Copper. Transition: 0.15s ease-out. Focus-visible: 2px Forge Copper outline, 2px offset.

### Map Control Buttons (MapNavBtn)

Bordered ghost button. Default: Forge Seam border, Steel Mist text, transparent background. Hover: Deep Copper border, copper/5% background, Forge Copper text. Active: same as hover, held. Radius: 6px. Padding: 6px 12px. Font: 13px, weight 600 (Figtree). Transition: 0.12s ease-out colors. Focus-visible: 2px Forge Copper outline.

### Map Floating Panels

Rounded-lg (8–10px), bg/90–95% opacity + 12px backdrop-blur. Structural ring: `ring-1 ring-copper/20`. Float shadow: `0 4px 24px black/30%`. All floating map UI (filter panel, search dropdown, popups) uses this pattern. Mobile bottom sheets use `rounded-t-2xl` (16px top radius only), max-height 70vh.

### Search Input

Rounded-md (6px), bg/90% backdrop-blur, ring-1 copper/20. Placeholder in muted/60%. Text in Forge Copper. Focus: ring shifts to copper/60%. No border — only the ring. Font: 13–14px Figtree.

### Filter Checkboxes

Native `<input type="checkbox">` with `accent-color: var(--color-copper)`. Category label text in Steel Mist, truncated. Count in Ash at 50% opacity (10px mono). Indent children by 16px (pl-4). Section headers: 10px mono, weight 600, uppercase, tracking 0.1em, muted/60%.

### Range Slider

Track: 4px tall, full-width, Forge Seam background, rounded-full. Range fill: Forge Copper at 70% opacity. Thumb: 14×14px circle, Forge Seam border (60% copper), Carbon Hearth fill, shadow. Focus-visible: 2px ring at copper/50%.

### Wynnic Decoration

The game's Wynnic script (`font-family: 'wynn-wynnic'`) used as background texture only. Opacity: 0.05. Color: Forge Copper. Pointer-events none. Never carries meaning — it's atmospheric fill for hero sections only.

## 6. Do's and Don'ts

### Do:

- **Do** tint every neutral toward hue 30. `oklch(14% 0.006 30)` is the floor; `oklch(92% 0.004 30)` is the ceiling.
- **Do** use Forge Copper only on interactive, selected, or focused elements. If it appears at rest decoratively, remove it.
- **Do** use Geist Mono for anything that reads as system output: counts, coordinates, section labels, the logo.
- **Do** use Barlow Semi Condensed at weight 600 minimum. Never below.
- **Do** cap body line length at 65ch. Dense data UI doesn't mean dense reading columns.
- **Do** use backdrop-blur + bg/90–95% opacity for floating map panels. They exist in the map environment, not above it.
- **Do** transition colors and background at 0.12–0.15s ease-out. Faster reads as broken; slower reads as laggy.
- **Do** reserve Wynnic script decoration for hero sections at ≤5% opacity. It earns its place once.
- **Do** use `prefers-reduced-motion: reduce` to kill all transitions and animations unconditionally.
- **Do** put focus rings at 2px solid Forge Copper with 2px offset on every interactive element.

### Don't:

- **Don't** use `#000` or `#fff`. Every surface is tinted. Pure black or white will read immediately as foreign.
- **Don't** use Ingot Gold (`--color-gold`) on UI elements. It's game-world context only — item rarities, stat highlights. Putting it on a button or nav link breaks the semantic.
- **Don't** use a border-left greater than 1px as a colored accent stripe on cards, list items, or callouts. Rewrite with full borders, background tints, or leading icons.
- **Don't** use gradient text (`background-clip: text` with a gradient). Use Forge Copper solid.
- **Don't** use Glassmorphism decoratively. Backdrop-blur is structural (floating panels exist in layered environments); it is not aesthetic.
- **Don't** use the hero-metric template (big number, small label, gradient accent) — this is explicitly SaaS cliché territory.
- **Don't** build identical icon-heading-text card grids. The tool cards use a horizontal layout with icon + body + arrow for a reason.
- **Don't** add parchment textures, medieval ornament, pixel art fonts, or anything that says "this is a game" instead of "this is a tool." That's the hppeng aesthetic this project replaces.
- **Don't** use crypto/NFT visual language: neon on black, blurry hero gradients, vague hype copy ("the future of X"), orbital glows.
- **Don't** use generic SaaS landing patterns: "Ship faster" headlines, three-card feature rows, frosted-glass hero panels.
- **Don't** apply `transform: translateY(-Xpx)` to cards on hover. Horizontal nudge on chevrons/arrows is the only permitted movement.
- **Don't** shadow elements at rest. Glows and shadows are state responses — hover, focus, float — not decoration.
