# wynn.tools

Companion site for Wynncraft: item/ingredient search, build and crafted-item tools, and sharing.

## Language

### Tooltips

**Tooltip**:
An in-game-styled card showing one game object (item, ingredient, tome, charm, material, crafted item) or a build's summary.
_Avoid_: Card, preview (when meaning the object card)

**Build preview**:
The hover tooltip summarising a saved build on the builds list.
_Avoid_: Build tooltip, build quickview

**Crafted item**:
An item produced in the crafter from a recipe and ingredients, identified by its hash.
_Avoid_: Custom item, custom ingredient

**Tooltip export**:
A PNG image of a tooltip at its desktop size, stamped with the `wynn.tools` watermark (and the build link for a build preview), downloaded or copied to the clipboard.
_Avoid_: Screenshot, share image, OG image

**OG image**:
The server-rendered link-preview image for a page; distinct from a tooltip export and not what the user sees on screen.
_Avoid_: Share card, tooltip export
