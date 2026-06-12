# Stock image previews — design

Status: approved 2026-06-12
Owner: @DevScyu

## Problem

The stock system has full backend storage for image previews (`stock_media` table) and a working detail-page gallery (`StockMediaGallery.vue`), but no write path: authors cannot attach images. The `media[]` array is effectively always empty in production. Card thumbnails are also absent.

## Goals

- Authors can attach up to **8 images** per creation, with optional captions and drag-to-reorder.
- Images can be added at draft-creation time (`/stock/new`) and later via the edit page (`/stock/[slug]/edit`).
- The card grid (`/stock`) shows the first image as a thumbnail without layout shift.
- The implementation mirrors the existing `replaceDraftParts` pattern (bulk replace, transactional refcount diff) so the operational story (orphan blob cleanup, refcount integrity) stays uniform.

## Non-goals

- Server-side thumbnail variants (resized WebP). The card serves the original; browser scales. Revisit if grid feels slow.
- Replace-in-place media edits. Delete + add covers this.
- Granular media endpoints (POST add / DELETE one / PATCH caption / PATCH reorder). The editor sends the full list on save.

## Data model

`stock_media (id, creationId, order, blobSha256, caption, createdAt)` already exists and is unchanged.

**Schema change**: add two nullable smallints to `stock_blob`:

- `width  smallint`
- `height smallint`

Populated on upload for image-mime blobs (header-only probe via `image-size`, no decoding). Existing rows stay `NULL`; UI falls back to CSS aspect-ratio when missing. Drizzle migration generated via `pnpm db:generate`.

## API

All routes mounted under `/v1/stock/*`. Auth follows existing rules: session cookie (creation owner) or bearer with `stock:write` scope. Cookie mutations enforce same-origin `Origin`.

### `POST /v1/stock/uploads` (extend existing)

- Behavior unchanged for callers: still accepts `multipart/form-data` with `file`, still returns `{ sha256, byteSize, mimeType }`.
- When `sniffImageMime` returns a mime, also run `image-size` on the buffer and persist `width` and `height` on the inserted `stock_blob` row. Failure to probe is non-fatal (columns remain `NULL`).

### `PUT /v1/stock/:slug/media` (new)

Body (Zod):

```ts
{
  media: Array<{
    blobSha256: string; // must exist and resolve to an image-mime blob
    caption: string | null; // max 200 chars; null or omitted = no caption
  }>; // max length 8
}
```

Semantics: bulk replace the creation's `stock_media` rows. Implementation mirrors `replaceDraftParts`:

1. Inside a transaction, select existing `stock_media` rows for the creation (`blobSha256` only).
2. Delete them.
3. Insert new rows, `order = arrayIndex`.
4. Recompute distinct `blobSha256` deltas vs. previous set; `+1` `stockBlob.refCount` for new shas, `-1` for removed shas.
5. Update `stock_creation.updatedAt` and `lastActivityAt = NOW()` (media changes are user-visible content).

Errors:

- `400 bad_media` — `media.length > 8`, blob not found, blob is not image-mime.
- `403 forbidden` — not the owner, or bearer without `stock:write`.
- `404 not_found` — slug not found or soft-deleted.

Returns `{ ok: true }`.

### `POST /v1/stock` (extend existing create)

Add optional `media: [...]` field with the same shape and validation as `PUT .../media`. Applied in the same transaction that creates the draft. Enables `new.vue` to attach screenshots without a second roundtrip.

## Frontend

### `/stock/new` — add an optional "Screenshots" section

Above the action row. File input + drop zone. Each selected file:

1. POSTs to `/uploads`.
2. On success, push `{ blobSha256, caption: '', previewUrl }` into a local `media` ref. `previewUrl` is `URL.createObjectURL(file)` for instant feedback; `blobSha256` drives the actual submit payload.
3. Inline caption input per row, optional drag-to-reorder, remove button.

`submit()` passes `media: media.value.map(({ blobSha256, caption }) => ({ blobSha256, caption: caption || null }))` to `api.create`. Section is optional — empty array submits fine.

Abandoned uploads (user uploads then closes the tab) leave a `stock_blob` row at `refCount: 0`, swept by the existing orphan-blob cleanup that already covers abandoned `/uploads` calls.

### `/stock/[slug]/edit` — full "Screenshots" editor

Same component as new.vue's section, but seeded from `c.media`. An explicit "Save screenshots" button calls `api.replaceMedia(slug, media)` → `PUT /v1/stock/:slug/media`; matches the explicit-save pattern used elsewhere on the edit page (parts, metadata). Drag-to-reorder is plain HTML5 DnD (list ≤8, no library needed). 8-item cap is enforced both client-side (disable add) and server-side.

### `StockMediaGallery.vue`

No change. Already consumes `c.media`.

### `StockCard.vue` + list payload

`StockListItem` gains three fields:

- `thumbnailSha: string | null`
- `thumbnailWidth: number | null`
- `thumbnailHeight: number | null`

`stock-read.ts` list query joins `stock_media` (where `order = 0`) and `stock_blob` to populate them.

`StockCard.vue` renders, when `thumbnailSha` is present:

```html
<img
  class="card-thumb"
  :src="api.blobUrl(item.thumbnailSha)"
  :width="item.thumbnailWidth ?? undefined"
  :height="item.thumbnailHeight ?? undefined"
  loading="lazy"
  decoding="async"
  alt=""
/>
```

Styled with `aspect-ratio: 16 / 10; object-fit: cover; width: 100%;` so missing dimensions still avoid layout shift. Tokens only (no hardcoded colors), per `CLAUDE.md` design rules.

### `useStockApi.ts`

Add:

- `replaceMedia(slug: string, media: Array<{ blobSha256: string, caption: string | null }>): Promise<{ ok: true }>`

`create` signature extended with optional `media` field.

## Types

`app/lib/types/stock.ts`:

- `StockListItem`: add `thumbnailSha`, `thumbnailWidth`, `thumbnailHeight` (all nullable).
- No change to `StockMedia` or `StockCreation`.

## Validation & limits

| Limit               | Value                      | Enforced                                                        |
| ------------------- | -------------------------- | --------------------------------------------------------------- |
| Images per creation | 8                          | server (`PUT .../media`, `POST /v1/stock`); client disables add |
| Image bytes         | existing `IMAGE_MAX`       | `POST /uploads`                                                 |
| Image MIME          | sniff via `sniffImageMime` | `POST /uploads`; `PUT .../media` rejects non-image blobs        |
| Caption length      | 200 chars                  | server + client                                                 |

## Refcount and cleanup

- Refcount integrity is the only place this design touches blob lifecycle. The diff-based approach inside `PUT .../media` is the same pattern `replaceDraftParts` uses today.
- Orphan blobs from abandoned `/uploads` calls are handled by the existing cleanup story; no new job needed.

## Testing

Backend (`api/test/`, runs against real Postgres):

- `stock-media.test.ts`:
  - PUT replaces rows in order; refcount diff correct on add/remove/no-op.
  - 8-cap enforced.
  - Non-image blob rejected.
  - Non-owner forbidden; bearer without `stock:write` forbidden.
  - `lastActivityAt` and `updatedAt` advance.
- Extend `stock-write.test.ts` (or equivalent) — `POST /v1/stock` with `media` array creates rows and refcounts correctly.
- Extend `stock-read-service.test.ts` — list returns `thumbnailSha`/`width`/`height` when first media row exists.

Frontend: follow project convention — no component-render tests. `pnpm lint && pnpm build` verifies the editor compiles. `app/lib/` gains no new modules, so no new unit tests.

## Out of scope / follow-ups

- Server-side resized thumbnails (revisit if card grid feels slow).
- Per-image alt text (currently `alt=""` since these are decorative previews; revisit when accessibility audit covers stocks).
- Animated GIF / video previews.
