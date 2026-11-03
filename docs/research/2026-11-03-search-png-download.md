# PNG download for search results (ingredients, tomes, charms, materials)

Date: 2026-11-03. Request: "It would be nice if the download png option existed for ingredients and other stuff in the search."

## 1. How the existing item PNG export works

**Engine: client-side DOM capture with `html-to-image`** (`package.json` dep `html-to-image ^1.11.13`, installed 1.11.13), wrapped in one composable: `app/composables/useTooltipExport.ts`.

- `renderBlob(el)` (`app/composables/useTooltipExport.ts:47-72`):
  - un-hides the element's `[data-export-footer]` child (`:48-51`) and adds the class `is-exporting` (`:52`)
  - inlines `border-image` URLs as data URIs (`:53`, helper at `:15-39`). html-to-image embeds `background`, `background-image` and `mask`/`-webkit-mask(-image)` (`node_modules/html-to-image/es/embed-images.js:17-22`) but not `border-image`, and the pixel-art tooltip frame is a `border-image`. That's why the helper exists.
  - awaits `document.fonts.ready` (`:55`), then `toBlob(el, { pixelRatio: 2, cacheBust: true, filter })`. The filter drops any node with `data-export-ignore` (`:56-64`).
  - restores borders, the class and the footer in `finally` (`:66-71`)
- `exportTooltip(el, filename)` downloads through an `<a download>` built on an object URL (`:74-98`). On failure it shows a toast: "Couldn't export image — try again." (`:93`).
- `copyTooltip(el)` writes the image to the clipboard with `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` (`:100-125`). It first checks that `ClipboardItem` and `navigator.clipboard.write` exist (`:103-106`).
- It returns `{ exporting, copying, copied, exportTooltip, copyTooltip }` (`:127`). The composable is generic: it takes any `HTMLElement`, and nothing in it is specific to items.

**UI: two buttons, "Copy PNG" and "Download PNG"**, inside `ItemTooltip` (`app/components/Item/Tooltip.vue:191-212`). A context menu or overflow menu does not exist.

- They only render when the `exportable` prop is true, and it defaults to `true` (`Item/Tooltip.vue:27,33`).
- The button row carries `data-export-ignore`, so it isn't captured (`:191`). It is absolutely positioned _above_ the tooltip (`top:-10px; transform: translateY(-100%)`, `:767-775`).
- The capture root is `containerRef`, the `.tt-wrap` element (`:171,190`).
- A `wynn.tools` watermark (`[data-export-footer]`, `display:none` normally) appears only in the exported image (`:374-376`, `:816-824`).
- `.is-exporting` makes the container background transparent (`:388-390`).

**File naming:** the default is `displayName` lowercased, with non-alphanumerics collapsed to `-`, plus `.png` (fallback `item.png`) (`Item/Tooltip.vue:177-178`). The `exportFilename` prop overrides it (`:30,177`). The Inspector passes a slug of the decoded name (`app/components/Inspector/Preview.vue:34-37,45`). Wynndle uses `wynndle-{mode}-{n}-{score}.png` (`app/components/Wynndle/ShareGrid.vue:59`).

**All callers of `useTooltipExport`:** `app/components/Item/Tooltip.vue:172` and `app/components/Wynndle/ShareGrid.vue:54`. ShareGrid uses its own `[data-export-only]` header and footer, revealed by `.share-card.is-exporting` (`ShareGrid.vue:73,92,149-173`). That is a second working example of capturing a non-item element.

**All `<ItemTooltip>` call sites and their export state:**

| Call site                                                                       | exportable                     | Context                                              |
| ------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `app/pages/items/[name].vue:117`                                                | yes (default)                  | item detail page hero                                |
| `app/components/Inspector/Preview.vue:41` (used by `app/pages/inspect.vue:104`) | yes (default), custom filename | /inspect                                             |
| `app/components/EquipmentGrid.vue:235`                                          | yes (default)                  | inside a hover `Quickview` (`EquipmentGrid.vue:168`) |
| `app/components/Builder/Rail.vue:63`                                            | yes (default)                  | inside a hover `Quickview` (`Rail.vue:48`)           |
| `app/components/Item/ResultCard.vue:22`                                         | **no**                         | **search results, Items tab**                        |
| `app/components/ItemChip.vue:134`                                               | no                             | chip hover                                           |
| `app/components/Inspector/ListingCard.vue:50-56`                                | no                             | market listings (compact, zoomed)                    |

The `exportable=false` on the search card came in with the original feature commit `dd1e48d feat: export item tooltip as PNG` (it touched `Item/ResultCard.vue`). So **even items have no PNG option inside search today**. A user gets it by clicking through to `/items/[name]`.

**No server path is used for downloads.** OG images do exist server-side (see section 3), but the download is purely client DOM capture.

## 2. The search

- Page: `app/pages/items/index.vue`, inside the shared layout shell `app/components/SearchPage.vue` (the shell is also used by /builds, /crafted and /stock, per `SearchPage.vue:3-4`).
- There are five tabs, `'items' | 'ingredients' | 'tomes' | 'charms' | 'materials'` (`items/index.vue:25,112-123`). Aspects, sets and crafted items are not result types here. Crafted items live on `/crafted` and render through `ItemCard` (`app/pages/crafted/index.vue:137`).
- Every tab except charms renders in `VirtualMasonry` (absolutely positioned lanes with a `transform`, `app/components/VirtualMasonry.vue:142,161`). Charms render in a plain column list (`items/index.vue:249-251`).

| Tab         | Card                                          | Tooltip                                                             | Card is a link?                    | PNG option                   |
| ----------- | --------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- | ---------------------------- |
| Items       | `Item/ResultCard.vue` (`items/index.vue:201`) | `ItemTooltip` with `:exportable="false"` (`Item/ResultCard.vue:22`) | yes, to `/items/{slug}` (`:17-23`) | no (only on the detail page) |
| Ingredients | `Ingredient/ResultCard.vue` (`:219`)          | `IngredientTooltip` (`Ingredient/ResultCard.vue:10`)                | no, a plain `div.card-link` (`:9`) | no                           |
| Tomes       | `Tome/ResultCard.vue` (`:237`)                | `TomeTooltip` (`Tome/ResultCard.vue:10`)                            | no                                 | no                           |
| Charms      | `Charm/ResultCard.vue` (`:250`)               | `CharmTooltip` (`Charm/ResultCard.vue:10`)                          | no                                 | no                           |
| Materials   | `Material/ResultCard.vue` (`:267`)            | `MaterialTooltip` (`Material/ResultCard.vue:10`)                    | no                                 | no                           |

**Why the non-item types lack it:** the buttons, the capture ref, the watermark footer and the `is-exporting` styling all live inside `Item/Tooltip.vue` (`:171-186,191-212,374-376,388-390`). `Ingredient/Tooltip.vue`, `Tome/Tooltip.vue`, `Charm/Tooltip.vue` and `Material/Tooltip.vue` take only their data prop (`Ingredient/Tooltip.vue:6`, `Tome/Tooltip.vue:7`, `Charm/Tooltip.vue:7`, `Material/Tooltip.vue:5`). They have no `exportable` prop, no ref, no footer and no import of the composable.

There is an existing hover-reveal action pattern to copy: the Items card shows `BuilderEquipButton` at the top-right on hover or focus. It is always visible under `@media (hover: none)` (`Item/ResultCard.vue:27-29,91-112`).

## 3. Shared shape and reuse

- **Same DOM skeleton.** Every tooltip uses `.tt-container > .tt-frame + .tt-inner > .tt-header`:
  - Ingredient: `Ingredient/Tooltip.vue:122-133`
  - Tome: `Tome/Tooltip.vue:58-62`
  - Charm: `Charm/Tooltip.vue:56-60`
  - Material: `Material/Tooltip.vue:61-65`
  - Crafted: `Crafter/ItemPreview.vue:231-236`

  Each has the same pixel `border-image` frame from `frameUrl(...)` (`Ingredient/Tooltip.vue:16,125`, `Tome/Tooltip.vue:15`, `Charm/Tooltip.vue:15`, `Material/Tooltip.vue:14`). Each uses `mask-image` separators and stars from `miscUrl(...)` (`Ingredient/Tooltip.vue:100-114`, `Tome/Tooltip.vue:50`, `Charm/Tooltip.vue:48`, `Material/Tooltip.vue:45,53`). All of these assets come from `https://cdn.wynn.tools/...` (`app/lib/items/icon.ts:1,21`), the same CDN the item export already handles.

  The only structural difference is that `ItemTooltip` wraps its container in an extra `.tt-wrap` (`Item/Tooltip.vue:190,383-387`) that hosts the buttons. The other tooltips' root is the `.tt-container` itself.

- The ingredient tooltip also uses `backgroundImage` for the effectiveness grid (`Ingredient/Tooltip.vue:116-118,209`). html-to-image embeds that (`embed-images.js:17-18`).
- `useTooltipExport` accepts any element (`useTooltipExport.ts:47,74,100`), and Wynndle already exports a non-tooltip element. So the capture logic needs no change for other types.
- **OG components (`*.takumi.vue`):**
  - `BuildCard`, `ItemCard`, `StockCard` and `WorldEventCard` exist in `app/components/OgImage/`.
  - **No ingredient, tome, charm or material OG component exists.**
  - The item OG PNG is served by `server/api/_og/item/[slug].get.ts:11-34`, which calls `buildOgImagePath('ItemCard', …)` (`:29`). The API caches and proxies it at `/v1/og/item/:slug` (`api/src/routes/og.ts:73-96`). It is used as the `ogImage` meta on the detail page (`app/pages/items/[name].vue:67`).
  - It is a 1200×630-style social card with a hand-budgeted layout, because "Takumi can't measure text height" (`OgImage/ItemCard.takumi.vue:113-118`). It is not the tooltip, so reusing it for "download PNG" would give a different image from what the user sees.

## 4. Detail pages

- Items: `/items/[name]` (`app/pages/items/[name].vue`) shows `ItemTooltip` with export enabled (`:117`).
- **No detail pages exist for ingredients, tomes, charms or materials.** `app/pages/` has only `items/[name].vue` and `items/index.vue` under items. Their search cards aren't links (`Ingredient/ResultCard.vue:9`, etc.), so for these types the search card is the only surface.
- Crafted items: `/c/[id]` renders `CrafterWorkspace` (`app/pages/c/[id].vue:131`) → `CrafterItemPreview`, which has no export (`Crafter/ItemPreview.vue:231`). `/inspect` has export through `InspectorPreview`.

## 5. Gaps and risks

- **CSS `zoom: 0.75` on every search card** (`Item/ResultCard.vue:44`, `Ingredient/ResultCard.vue:25`, `Tome/…:25`, `Charm/…:25`, `Material/…:25`). The export has only been exercised on unzoomed surfaces (detail page, inspect). html-to-image sizes the clone from the node's own width and height (`node_modules/html-to-image/es/util.js:77-81`) and copies computed styles. How an ancestor's `zoom` interacts with that is unverified and could give a scaled or clipped capture. It needs a browser check, or the capture should target an element outside the zoomed wrapper.
- **Button placement:** the item buttons sit above the tooltip via `translateY(-100%)` (`Item/Tooltip.vue:767-775`). In a masonry card with a 12px gap (`items/index.vue:318-321`) they would overlap the card above. The detail-page layout doesn't carry over directly.
- **Clickable cards:** the Items card wraps the tooltip in a `NuxtLink` (`Item/ResultCard.vue:17-23`), so a button inside it needs `@click.prevent.stop`. The ingredient tooltip contains a `RouterLink` to the map (`Ingredient/Tooltip.vue:167-173`). It is captured fine, but it is interactive.
- **Fonts:** the tooltips use the self-hosted `wynncraft`, `wynn-five`, `wynn-ascii` and other faces from `/fonts/*.woff` (`app/assets/css/global.css:6-58` @font-face), same-origin, so html-to-image can embed them. `document.fonts.ready` (`useTooltipExport.ts:55`) only waits for fonts already requested. Lore and material segments that use rarely-loaded faces (`Material/Tooltip.vue:254-272`) are rendered on screen before capture, so they should be loaded. The walled-garden rule holds: the export buttons use `var(--font-mono)` and tokens (`Item/Tooltip.vue:776-799`), and the tooltip internals use hardcoded hex.
- **Theme leakage:** `.is-exporting` makes the container background transparent (`Item/Tooltip.vue:388-390`). The other tooltips have no equivalent rule, so whatever background `.tt-container` has would be captured. Not a correctness problem.
- **SSR:** the export runs only inside click handlers (`useTooltipExport.ts:74,100`), and the `/items` search page is SSR. html-to-image is imported at module top (`:1`), which is already the case today for SSR'd `/items/[name]`, so it is evidently safe.
- **Clipboard:** `copyTooltip` awaits the render before constructing `ClipboardItem` (`useTooltipExport.ts:109-112`). Safari generally requires the `ClipboardItem` to be created synchronously in the user gesture (passing a Promise<Blob>). That is unverified here, but it is a known WebKit constraint and would affect the existing item copy too. Download works everywhere. Firefox only recently gained `ClipboardItem`, and the guard at `:103` covers that.
- **Mobile:** under 480px the item tooltip shrinks its fonts (`Item/Tooltip.vue:717-765`), so a phone export comes out smaller or differently laid out. Hover-only buttons need the `@media (hover: none)` treatment (`Item/ResultCard.vue:107-112`). On iOS, `<a download>` with a blob URL opens a preview rather than saving.
- **Performance:** each export walks every descendant with `getComputedStyle` (`useTooltipExport.ts:17-19`) and fetches the frame image with `force-cache` (`:5`). That is fine per click. Mounting the composable per card in a virtualized list only adds a few refs.
- **Hover Quickview exports:** `EquipmentGrid` and `Builder/Rail` render exportable `ItemTooltip`s inside hover popovers (`EquipmentGrid.vue:168,235`, `Rail.vue:48,63`). The buttons there are reachable only while the popover stays open. This is existing behaviour and worth knowing when choosing defaults.

## Options (not a plan)

1. Use `useTooltipExport` directly in each `*/ResultCard.vue` and add a ref to the tooltip root plus a hover-reveal button, the way `BuilderEquipButton` is done. This also needs the `.is-exporting` and watermark handling per tooltip.
2. Lift the `.tt-wrap` + buttons + footer out of `Item/Tooltip.vue` into a small wrapper component used by all five tooltips (and optionally `CrafterItemPreview`). The item search card then flips `exportable` on.
3. A server-side PNG through new `*.takumi.vue` components. This means a new component per type, and the output wouldn't match the on-screen tooltip (`OgImage/ItemCard.takumi.vue:113-118`). Least aligned with the request.
