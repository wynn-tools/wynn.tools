# Stock Image Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authors attach up to 8 image previews per stock creation (in `new` and `edit`), and show the first one as a card thumbnail.

**Architecture:** All blob storage and the detail-page gallery already exist. Add a write path that mirrors `replaceDraftParts` (bulk replace inside a transaction, with refcount diff), extend `POST /uploads` to capture image dimensions, and surface the first media item in the list payload. Frontend: a single shared `ScreenshotsEditor.vue` reused by `new.vue` and `edit.vue`; card thumbnail rendered inside `StockCard.vue` when `thumbnailSha` is set.

**Tech Stack:** Hono + Drizzle + Postgres (backend), Nuxt 4 + Vue 3 + Pinia (frontend). New backend dependency: `image-size` (~5 kB, header-only dimension probe).

**Spec:** `docs/superpowers/specs/2026-06-12-stock-image-previews-design.md`

---

## File Map

**Backend** (`api/`)

- Modify `src/db/schema.ts` — add `width`/`height` to `stockBlob`.
- Add `drizzle/<n>_stock_blob_dimensions.sql` (generated).
- Modify `src/routes/stock.ts` — extend `POST /uploads`, extend `POST /`, add `PUT /:slug/media`.
- Modify `src/services/stock-write.ts` — add `replaceMedia()`, extend `createDraftCreation()` to accept `media`.
- Modify `src/services/stock-read.ts` — include thumbnail fields in `listCreations`.
- Add `package.json` dep: `image-size`.
- Add `test/stock-media-route.test.ts`, `test/stock-media-service.test.ts`.
- Extend `test/stock-uploads-route.test.ts` (dimensions probe).
- Extend `test/stock-read-routes.test.ts` (thumbnail in list).

**Frontend** (`app/`)

- Modify `lib/types/stock.ts` — `StockListItem` gains thumbnail fields.
- Modify `composables/useStockApi.ts` — extend `create`, add `replaceMedia`.
- Add `components/stock/ScreenshotsEditor.vue` (shared by new + edit).
- Modify `pages/stock/new.vue` — mount editor, pass `media` to `create`.
- Modify `pages/stock/[slug]/edit.vue` — mount editor, wire `replaceMedia`.
- Modify `components/stock/StockCard.vue` — render thumbnail.

---

## Task 1: Add `width`/`height` to `stock_blob` + migration

**Goal:** Schema change for image dimensions, generated migration committed, types updated.

**Files:**

- Modify: `api/src/db/schema.ts`
- Create: `api/drizzle/<n>_stock_blob_dimensions.sql` (generated)

**Acceptance Criteria:**

- [ ] `stock_blob` table has `width smallint NULL`, `height smallint NULL`.
- [ ] Drizzle migration file checked in.
- [ ] Existing rows are NULL after migrate.
- [ ] `pnpm db:migrate` runs cleanly on a fresh dev DB.

**Verify:** `cd api && pnpm db:migrate` → migration applies cleanly; `cd api && pnpm test:run stock-schema` → passes.

**Steps:**

- [ ] **Step 1: Edit schema**

In `api/src/db/schema.ts`, find the `stockBlob` table definition and add the two columns. Locate the existing `stockBlob` pgTable:

```ts
export const stockBlob = pgTable(
  "stock_blob",
  {
    sha256: text("sha256").primaryKey(),
    byteSize: integer("byte_size").notNull(),
    mimeType: text("mime_type").notNull(),
    originalFilename: text("original_filename").notNull(),
    refCount: integer("ref_count").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    // ...existing trailing columns
  } /* ...existing indexes */,
);
```

Add `width` and `height` as `integer` (Postgres `integer` is 4-byte; smallint isn't worth a custom type — and Drizzle's pg `integer` is the most natural fit for the existing column patterns in this file). Nullable (no `.notNull()`).

- [ ] **Step 2: Generate migration**

Run: `cd api && pnpm db:generate`
Expected: a new `drizzle/<NNNN>_<name>.sql` file containing `ALTER TABLE stock_blob ADD COLUMN width integer; ALTER TABLE stock_blob ADD COLUMN height integer;`.

- [ ] **Step 3: Apply locally and verify**

Run: `cd api && pnpm db:dev:up && pnpm db:migrate`
Expected: applies without errors.

- [ ] **Step 4: Run existing schema test**

Run: `cd api && pnpm test:run stock-schema`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/db/schema.ts api/drizzle/
git commit -s -m "feat(stock): add width/height to stock_blob"
```

---

## Task 2: Probe image dimensions on `POST /v1/stock/uploads`

**Goal:** Populate `width`/`height` on `stock_blob` rows for image uploads.

**Files:**

- Modify: `api/package.json` (add `image-size` dep)
- Modify: `api/src/routes/stock.ts` (probe + persist dimensions)
- Modify: `api/test/stock-uploads-route.test.ts` (assert dimensions stored)

**Acceptance Criteria:**

- [ ] After uploading a PNG, the matching `stock_blob` row has non-null `width` and `height` matching the image.
- [ ] Probe failure (corrupt header) does not 5xx the upload — width/height stay NULL, upload still succeeds and returns the existing `{sha256, byteSize, mimeType}` shape.
- [ ] Zip uploads leave dimensions NULL.

**Verify:** `cd api && pnpm test:run stock-uploads-route` → PASS.

**Steps:**

- [ ] **Step 1: Add dep**

Run: `cd api && pnpm add image-size`
Expected: `image-size` added to `api/package.json` dependencies.

- [ ] **Step 2: Write failing test for dimension persistence**

Add to `api/test/stock-uploads-route.test.ts` (alongside the existing PNG upload test):

```ts
it("records width/height for image uploads", async () => {
  const u = await makeUserWithSession();
  // 8x8 transparent PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4//8/w38GIAXDASc08wAAAABJRU5ErkJggg==",
    "base64",
  );
  const r = await postUpload(testApp(), png, "a.png", { Cookie: u.cookie });
  expect(r.status).toBe(200);
  const rows = await getDb().query.stockBlob.findMany();
  expect(rows).toHaveLength(1);
  expect(rows[0].width).toBe(8);
  expect(rows[0].height).toBe(8);
});

it("leaves dimensions null for zip uploads", async () => {
  const u = await makeUserWithSession();
  const r = await postUpload(testApp(), zipBytes(), "p.zip", {
    Cookie: u.cookie,
  });
  expect(r.status).toBe(200);
  const rows = await getDb().query.stockBlob.findMany();
  expect(rows[0].width).toBeNull();
  expect(rows[0].height).toBeNull();
});
```

- [ ] **Step 3: Run test, see it fail**

Run: `cd api && pnpm test:run stock-uploads-route`
Expected: the two new tests FAIL with `expected null to be 8` (or column not present).

- [ ] **Step 4: Implement probe**

In `api/src/routes/stock.ts`, near the other imports add:

```ts
import { imageSize } from "image-size";
```

Inside `stock.post('/uploads', ...)`, replace the existing image branch:

```ts
const image = sniffImageMime(buf);
let width: number | null = null;
let height: number | null = null;
if (image) {
  if (buf.length > IMAGE_MAX)
    throw new AppError(413, "too_large", `image max is ${IMAGE_MAX} bytes`);
  mimeType = image;
  try {
    const dims = imageSize(buf);
    if (dims.width && dims.height) {
      width = dims.width;
      height = dims.height;
    }
  } catch {
    // probe failure is non-fatal — leave dimensions null
  }
} else {
  // zip branch (unchanged)
}
```

Then in the `insert(schema.stockBlob).values({...})` call, add `width` and `height`:

```ts
await getDb()
  .insert(schema.stockBlob)
  .values({
    sha256,
    byteSize,
    mimeType,
    originalFilename: file.name || "upload",
    refCount: 0,
    width,
    height,
  })
  .onConflictDoNothing({ target: schema.stockBlob.sha256 });
```

- [ ] **Step 5: Run tests, see them pass**

Run: `cd api && pnpm test:run stock-uploads-route`
Expected: PASS (all uploads tests including the two new ones).

- [ ] **Step 6: Commit**

```bash
git add api/package.json api/pnpm-lock.yaml api/src/routes/stock.ts api/test/stock-uploads-route.test.ts
git commit -s -m "feat(stock): probe image dimensions on upload"
```

---

## Task 3: `replaceMedia` service function

**Goal:** Pure service that bulk-replaces a creation's media rows in a transaction, diffs `stockBlob.refCount` correctly, validates ownership-agnostic constraints (the route enforces ownership separately).

**Files:**

- Modify: `api/src/services/stock-write.ts`
- Create: `api/test/stock-media-service.test.ts`

**Acceptance Criteria:**

- [ ] Replaces all existing rows for the creation atomically.
- [ ] `refCount` deltas are correct on add, remove, and unchanged shas.
- [ ] Rejects `media.length > 8` with `400 bad_media`.
- [ ] Rejects a `blobSha256` that doesn't exist or isn't an image MIME with `400 bad_media`.
- [ ] Rejects `caption.length > 200` with `400 bad_media`.
- [ ] `lastActivityAt` and `updatedAt` on the creation advance.
- [ ] Empty array clears all media (allowed).

**Verify:** `cd api && pnpm test:run stock-media-service` → PASS.

**Steps:**

- [ ] **Step 1: Write failing tests**

Create `api/test/stock-media-service.test.ts`:

```ts
import { Buffer } from "node:buffer";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb, schema } from "../src/db/client";
import { resetEnvCache } from "../src/env";
import { writeBlob } from "../src/services/blob-store";
import { createDraftCreation, replaceMedia } from "../src/services/stock-write";
import { makeUser } from "./helpers/auth";
import { resetDb } from "./helpers/db";

const TMP = mkdtempSync(join(tmpdir(), "media-svc-"));

beforeAll(() => {
  process.env.UPLOAD_DIR = TMP;
  resetEnvCache();
});

async function makeImageBlob(byte: number): Promise<string> {
  // distinct content per `byte` → distinct sha
  const buf = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    byte,
    0,
    0,
    0,
  ]);
  const { sha256, byteSize } = await writeBlob(buf);
  await getDb()
    .insert(schema.stockBlob)
    .values({
      sha256,
      byteSize,
      mimeType: "image/png",
      originalFilename: "x.png",
      refCount: 0,
    })
    .onConflictDoNothing();
  return sha256;
}

async function makeZipBlob(): Promise<string> {
  const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
  const { sha256, byteSize } = await writeBlob(buf);
  await getDb()
    .insert(schema.stockBlob)
    .values({
      sha256,
      byteSize,
      mimeType: "application/zip",
      originalFilename: "x.zip",
      refCount: 0,
    })
    .onConflictDoNothing();
  return sha256;
}

async function makeCreation() {
  const u = await makeUser();
  return await createDraftCreation({
    userId: u.id,
    title: "T",
    kind: "infobox",
    category: "qol",
    classes: [],
  });
}

describe("replaceMedia", () => {
  beforeEach(resetDb);

  it("inserts rows in order", async () => {
    const { id } = await makeCreation();
    const a = await makeImageBlob(1);
    const b = await makeImageBlob(2);
    await replaceMedia(id, [
      { blobSha256: a, caption: "first" },
      { blobSha256: b, caption: null },
    ]);
    const rows = await getDb().query.stockMedia.findMany({
      where: (m, { eq }) => eq(m.creationId, id),
      orderBy: (m, { asc }) => [asc(m.order)],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].blobSha256).toBe(a);
    expect(rows[0].caption).toBe("first");
    expect(rows[0].order).toBe(0);
    expect(rows[1].blobSha256).toBe(b);
    expect(rows[1].order).toBe(1);
  });

  it("diffs refcount on add and remove", async () => {
    const { id } = await makeCreation();
    const a = await makeImageBlob(1);
    const b = await makeImageBlob(2);
    await replaceMedia(id, [{ blobSha256: a, caption: null }]);
    let blobs = await getDb().query.stockBlob.findMany();
    expect(blobs.find((x) => x.sha256 === a)!.refCount).toBe(1);
    expect(blobs.find((x) => x.sha256 === b)!.refCount).toBe(0);
    await replaceMedia(id, [{ blobSha256: b, caption: null }]);
    blobs = await getDb().query.stockBlob.findMany();
    expect(blobs.find((x) => x.sha256 === a)!.refCount).toBe(0);
    expect(blobs.find((x) => x.sha256 === b)!.refCount).toBe(1);
  });

  it("no-op when sha set unchanged keeps refcount stable", async () => {
    const { id } = await makeCreation();
    const a = await makeImageBlob(1);
    await replaceMedia(id, [{ blobSha256: a, caption: "x" }]);
    await replaceMedia(id, [{ blobSha256: a, caption: "y" }]);
    const blob = (await getDb().query.stockBlob.findMany()).find(
      (x) => x.sha256 === a,
    )!;
    expect(blob.refCount).toBe(1);
  });

  it("empty array clears media and decrements refcount", async () => {
    const { id } = await makeCreation();
    const a = await makeImageBlob(1);
    await replaceMedia(id, [{ blobSha256: a, caption: null }]);
    await replaceMedia(id, []);
    const blob = (await getDb().query.stockBlob.findMany()).find(
      (x) => x.sha256 === a,
    )!;
    expect(blob.refCount).toBe(0);
    expect(await getDb().query.stockMedia.findMany()).toHaveLength(0);
  });

  it("rejects more than 8 items", async () => {
    const { id } = await makeCreation();
    const shas = await Promise.all(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map(makeImageBlob),
    );
    await expect(
      replaceMedia(
        id,
        shas.map((s) => ({ blobSha256: s, caption: null })),
      ),
    ).rejects.toMatchObject({ code: "bad_media" });
  });

  it("rejects non-image blob", async () => {
    const { id } = await makeCreation();
    const z = await makeZipBlob();
    await expect(
      replaceMedia(id, [{ blobSha256: z, caption: null }]),
    ).rejects.toMatchObject({ code: "bad_media" });
  });

  it("rejects missing blob", async () => {
    const { id } = await makeCreation();
    await expect(
      replaceMedia(id, [{ blobSha256: "a".repeat(64), caption: null }]),
    ).rejects.toMatchObject({ code: "bad_media" });
  });

  it("rejects caption over 200 chars", async () => {
    const { id } = await makeCreation();
    const a = await makeImageBlob(1);
    await expect(
      replaceMedia(id, [{ blobSha256: a, caption: "x".repeat(201) }]),
    ).rejects.toMatchObject({ code: "bad_media" });
  });

  it("advances updatedAt and lastActivityAt", async () => {
    const { id } = await makeCreation();
    const before = (await getDb().query.stockCreation.findFirst({
      where: (c, { eq }) => eq(c.id, id),
    }))!;
    await new Promise((r) => setTimeout(r, 5));
    const a = await makeImageBlob(1);
    await replaceMedia(id, [{ blobSha256: a, caption: null }]);
    const after = (await getDb().query.stockCreation.findFirst({
      where: (c, { eq }) => eq(c.id, id),
    }))!;
    expect(after.updatedAt.getTime()).toBeGreaterThan(
      before.updatedAt.getTime(),
    );
    expect(after.lastActivityAt.getTime()).toBeGreaterThan(
      before.lastActivityAt.getTime(),
    );
  });
});
```

(`makeUser` and `resetDb` are existing test helpers; verify the import paths against `api/test/helpers/auth.ts` and `api/test/helpers/db.ts` before running.)

- [ ] **Step 2: Run tests, see them fail**

Run: `cd api && pnpm db:test:up && pnpm test:run stock-media-service`
Expected: FAIL with `replaceMedia is not a function` (or import error).

- [ ] **Step 3: Implement `replaceMedia`**

In `api/src/services/stock-write.ts`, add:

```ts
export interface MediaInput {
  blobSha256: string;
  caption: string | null;
}

const MAX_MEDIA = 8;
const MAX_CAPTION = 200;
const IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export async function replaceMedia(
  creationId: string,
  media: MediaInput[],
): Promise<void> {
  if (media.length > MAX_MEDIA)
    throw new AppError(400, "bad_media", `max ${MAX_MEDIA} media items`);
  for (const m of media) {
    if (m.caption !== null && m.caption.length > MAX_CAPTION)
      throw new AppError(400, "bad_media", `caption max ${MAX_CAPTION} chars`);
  }

  const db = getDb();
  const shaSet = [...new Set(media.map((m) => m.blobSha256))];
  if (shaSet.length > 0) {
    const blobs = await db.query.stockBlob.findMany({
      where: (b, { inArray }) => inArray(b.sha256, shaSet),
      columns: { sha256: true, mimeType: true },
    });
    const byHash = new Map(blobs.map((b) => [b.sha256, b.mimeType]));
    for (const sha of shaSet) {
      const mime = byHash.get(sha);
      if (!mime) throw new AppError(400, "bad_media", `blob ${sha} not found`);
      if (!IMAGE_MIMES.has(mime))
        throw new AppError(400, "bad_media", `blob ${sha} is not an image`);
    }
  }

  await db.transaction(async (tx) => {
    const existing = await tx.query.stockMedia.findMany({
      where: (m, { eq }) => eq(m.creationId, creationId),
      columns: { blobSha256: true },
    });

    const oldCounts = countShas(existing.map((e) => e.blobSha256));
    const newCounts = countShas(media.map((m) => m.blobSha256));

    await tx
      .delete(schema.stockMedia)
      .where(eq(schema.stockMedia.creationId, creationId));

    if (media.length > 0) {
      await tx.insert(schema.stockMedia).values(
        media.map((m, i) => ({
          id: newResourceId(),
          creationId,
          order: i,
          blobSha256: m.blobSha256,
          caption: m.caption,
        })),
      );
    }

    const allShas = new Set([...oldCounts.keys(), ...newCounts.keys()]);
    for (const sha of allShas) {
      const delta = (newCounts.get(sha) ?? 0) - (oldCounts.get(sha) ?? 0);
      if (delta === 0) continue;
      await tx
        .update(schema.stockBlob)
        .set({ refCount: sql`${schema.stockBlob.refCount} + ${delta}` })
        .where(eq(schema.stockBlob.sha256, sha));
    }

    const now = new Date();
    await tx
      .update(schema.stockCreation)
      .set({ updatedAt: now, lastActivityAt: now })
      .where(eq(schema.stockCreation.id, creationId));
  });
}

function countShas(shas: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of shas) m.set(s, (m.get(s) ?? 0) + 1);
  return m;
}
```

- [ ] **Step 4: Run tests, see them pass**

Run: `cd api && pnpm test:run stock-media-service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/services/stock-write.ts api/test/stock-media-service.test.ts
git commit -s -m "feat(stock): replaceMedia service with refcount diff"
```

---

## Task 4: `PUT /v1/stock/:slug/media` route + extend create with media

**Goal:** HTTP surface for the editor. Bulk-replace on the existing creation, and an optional `media` array on `POST /v1/stock`.

**Files:**

- Modify: `api/src/routes/stock.ts`
- Modify: `api/src/services/stock-write.ts` (extend `createDraftCreation`)
- Create: `api/test/stock-media-route.test.ts`

**Acceptance Criteria:**

- [ ] `PUT /v1/stock/:slug/media` requires auth; 403 for non-owner; 403 for bearer without `stock:write`.
- [ ] 200 on owner request; media rows replaced.
- [ ] 400 `bad_media` on cap, missing blob, non-image blob, oversized caption.
- [ ] 404 when slug doesn't exist or is soft-deleted.
- [ ] `POST /v1/stock` with `media: [...]` creates the draft and attaches media in one transaction.

**Verify:** `cd api && pnpm test:run stock-media-route` → PASS.

**Steps:**

- [ ] **Step 1: Write failing route tests**

Create `api/test/stock-media-route.test.ts` modelled on `stock-uploads-route.test.ts` + `stock-write-routes.test.ts`. Include cases:

```ts
import { Buffer } from "node:buffer";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb, schema } from "../src/db/client";
import { env, resetEnvCache } from "../src/env";
import { writeBlob } from "../src/services/blob-store";
import { testApp } from "./helpers/app";
import { makeBearer, makeUserWithSession } from "./helpers/auth";
import { resetDb } from "./helpers/db";

const TMP = mkdtempSync(join(tmpdir(), "media-route-"));

beforeAll(() => {
  process.env.UPLOAD_DIR = TMP;
  resetEnvCache();
});

async function makeImageBlob(byte: number): Promise<string> {
  const buf = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    byte,
    0,
    0,
    0,
  ]);
  const { sha256, byteSize } = await writeBlob(buf);
  await getDb()
    .insert(schema.stockBlob)
    .values({
      sha256,
      byteSize,
      mimeType: "image/png",
      originalFilename: "x.png",
      refCount: 0,
    })
    .onConflictDoNothing();
  return sha256;
}

async function createDraft(call: ReturnType<typeof testApp>, cookie: string) {
  const r = await call("/v1/stock", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Origin: env().FRONTEND_URL,
      Cookie: cookie,
    },
    body: JSON.stringify({
      title: "T",
      kind: "infobox",
      category: "qol",
      classes: [],
    }),
  });
  return (await r.json()) as { slug: string };
}

describe("pUT /v1/stock/:slug/media", () => {
  beforeEach(resetDb);

  it("401 unauthenticated", async () => {
    const r = await testApp()("/v1/stock/x/media", { method: "PUT" });
    expect(r.status).toBe(401);
  });

  it("403 when not owner", async () => {
    const owner = await makeUserWithSession();
    const { slug } = await createDraft(testApp(), owner.cookie);
    const intruder = await makeUserWithSession();
    const a = await makeImageBlob(1);
    const r = await testApp()(`/v1/stock/${slug}/media`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        Origin: env().FRONTEND_URL,
        Cookie: intruder.cookie,
      },
      body: JSON.stringify({ media: [{ blobSha256: a, caption: null }] }),
    });
    expect(r.status).toBe(403);
  });

  it("403 when bearer lacks stock:write", async () => {
    const { header, userId } = await makeBearer({ scopes: ["stock:read"] });
    // create creation via owner cookie, then attempt bearer write
    const ownerSession = await makeUserWithSession({ userId });
    const { slug } = await createDraft(testApp(), ownerSession.cookie);
    const a = await makeImageBlob(1);
    const r = await testApp()(`/v1/stock/${slug}/media`, {
      method: "PUT",
      headers: { "content-type": "application/json", Authorization: header },
      body: JSON.stringify({ media: [{ blobSha256: a, caption: null }] }),
    });
    expect(r.status).toBe(403);
  });

  it("200 owner replaces media", async () => {
    const u = await makeUserWithSession();
    const { slug } = await createDraft(testApp(), u.cookie);
    const a = await makeImageBlob(1);
    const r = await testApp()(`/v1/stock/${slug}/media`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        Origin: env().FRONTEND_URL,
        Cookie: u.cookie,
      },
      body: JSON.stringify({ media: [{ blobSha256: a, caption: "hi" }] }),
    });
    expect(r.status).toBe(200);
    const rows = await getDb().query.stockMedia.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].caption).toBe("hi");
  });

  it("400 bad_media for >8 items", async () => {
    const u = await makeUserWithSession();
    const { slug } = await createDraft(testApp(), u.cookie);
    const shas = await Promise.all(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map(makeImageBlob),
    );
    const r = await testApp()(`/v1/stock/${slug}/media`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        Origin: env().FRONTEND_URL,
        Cookie: u.cookie,
      },
      body: JSON.stringify({
        media: shas.map((s) => ({ blobSha256: s, caption: null })),
      }),
    });
    expect(r.status).toBe(400);
  });

  it("404 unknown slug", async () => {
    const u = await makeUserWithSession();
    const r = await testApp()(`/v1/stock/nope/media`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        Origin: env().FRONTEND_URL,
        Cookie: u.cookie,
      },
      body: JSON.stringify({ media: [] }),
    });
    expect(r.status).toBe(404);
  });
});

describe("pOST /v1/stock with media", () => {
  beforeEach(resetDb);

  it("attaches media on create", async () => {
    const u = await makeUserWithSession();
    const a = await makeImageBlob(1);
    const r = await testApp()("/v1/stock", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Origin: env().FRONTEND_URL,
        Cookie: u.cookie,
      },
      body: JSON.stringify({
        title: "with media",
        kind: "infobox",
        category: "qol",
        classes: [],
        media: [{ blobSha256: a, caption: "hi" }],
      }),
    });
    expect(r.status).toBe(200);
    const { slug } = (await r.json()) as { slug: string };
    const c = await getDb().query.stockCreation.findFirst({
      where: (cc, { eq }) => eq(cc.slug, slug),
    });
    expect(c).toBeTruthy();
    const rows = await getDb().query.stockMedia.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].caption).toBe("hi");
    const blob = await getDb().query.stockBlob.findFirst({
      where: (b, { eq }) => eq(b.sha256, a),
    });
    expect(blob!.refCount).toBe(1);
  });
});
```

(Helpers: if `makeUserWithSession` doesn't accept a `{ userId }` option to make the same user own both a session and a bearer, fall back to creating both via separate calls and skip that one test. Confirm signature before assuming.)

- [ ] **Step 2: Run tests, see them fail**

Run: `cd api && pnpm test:run stock-media-route`
Expected: FAIL (route doesn't exist).

- [ ] **Step 3: Implement route + extend create**

In `api/src/routes/stock.ts`, add at the top of the imports:

```ts
import { replaceMedia } from "../services/stock-write";
```

Add the Zod schema near `createBody`:

```ts
const mediaItem = z.object({
  blobSha256: z.string().regex(/^[0-9a-f]{64}$/),
  caption: z.string().max(200).nullable().default(null),
});
const mediaBody = z.object({
  media: z.array(mediaItem).max(8),
});
```

Extend `createBody` with `media`:

```ts
const createBody = z.object({
  title: z.string().min(1).max(120),
  kind: z.enum(["infobox", "custom-bar", "bundle"]),
  category: z.enum([
    /* ...existing... */
  ]),
  classes: z
    .array(
      z.enum([
        /* ...existing... */
      ]),
    )
    .max(5)
    .optional()
    .default([]),
  description: z.string().max(8000).optional(),
  media: z.array(mediaItem).max(8).optional().default([]),
});
```

In the `stock.post('/', ...)` handler, after `createDraftCreation(...)` returns, if `body.media.length > 0` call `replaceMedia(id, body.media)` inside the same try.

Add the new PUT route after the patch route:

```ts
stock.put(
  "/:slug/media",
  requireAuth,
  zValidator("json", mediaBody),
  async (c) => {
    assertWriteScope(c);
    const { id } = await requireAuthorBySlug(c, c.req.param("slug"));
    await replaceMedia(id, c.req.valid("json").media);
    return c.json({ ok: true });
  },
);
```

- [ ] **Step 4: Run tests, see them pass**

Run: `cd api && pnpm test:run stock-media-route`
Expected: PASS. Also run `cd api && pnpm test:run stock-write-routes` to verify no regression — should still PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/routes/stock.ts api/test/stock-media-route.test.ts
git commit -s -m "feat(stock): PUT media route and create-with-media"
```

---

## Task 5: List endpoint surfaces thumbnail

**Goal:** Include `thumbnailSha`/`thumbnailWidth`/`thumbnailHeight` (from the first media row) on every `StockListItem`.

**Files:**

- Modify: `api/src/services/stock-read.ts`
- Modify: `api/test/stock-read-routes.test.ts` (or `stock-read-service.test.ts`, whichever covers the list query)

**Acceptance Criteria:**

- [ ] Each list item has `thumbnailSha: string | null`, `thumbnailWidth: number | null`, `thumbnailHeight: number | null`.
- [ ] For a creation with media, `thumbnailSha` matches the `order = 0` row's `blobSha256` and width/height match the blob.
- [ ] For a creation with no media, all three are `null`.
- [ ] Sort/cursor behavior unchanged.

**Verify:** `cd api && pnpm test:run stock-read` → PASS (catches both `stock-read-routes` and `stock-read-service`).

**Steps:**

- [ ] **Step 1: Locate the list select**

Open `api/src/services/stock-read.ts` and find the `getDb().select({...}).from(c).where(...).orderBy(...).limit(...)` call inside `listCreations`.

- [ ] **Step 2: Write failing test**

In `api/test/stock-read-routes.test.ts` (extend the existing list test or add a new one):

```ts
it("list items include thumbnailSha when media present", async () => {
  const u = await makeUserWithSession();
  // create + attach media via API (or service)
  const a = await makeImageBlobWithDims(8, 8);
  const created = await postCreate(u.cookie, {
    title: "T",
    kind: "infobox",
    category: "qol",
    media: [{ blobSha256: a, caption: null }],
  });
  const r = await testApp()("/v1/stock");
  const json = (await r.json()) as {
    items: Array<{
      slug: string;
      thumbnailSha: string | null;
      thumbnailWidth: number | null;
      thumbnailHeight: number | null;
    }>;
  };
  const item = json.items.find((i) => i.slug === created.slug)!;
  expect(item.thumbnailSha).toBe(a);
  expect(item.thumbnailWidth).toBe(8);
  expect(item.thumbnailHeight).toBe(8);
});

it("list items have null thumbnail when no media", async () => {
  const u = await makeUserWithSession();
  const created = await postCreate(u.cookie, {
    title: "T2",
    kind: "infobox",
    category: "qol",
  });
  const r = await testApp()("/v1/stock");
  const json = (await r.json()) as {
    items: Array<{ slug: string; thumbnailSha: string | null }>;
  };
  const item = json.items.find((i) => i.slug === created.slug)!;
  expect(item.thumbnailSha).toBeNull();
});
```

(`postCreate` and `makeImageBlobWithDims` are inline helpers in the test file — define them at the top of the file similar to how other tests define helpers. `makeImageBlobWithDims` reuses the upload route so dimensions are populated.)

- [ ] **Step 3: Run test, see it fail**

Run: `cd api && pnpm test:run stock-read-routes`
Expected: FAIL with `expected undefined to be ...` (fields not present).

- [ ] **Step 4: Implement using a lateral subquery**

Replace the `select({...})` chain in `listCreations` with a join to a `stock_media` (`order = 0`) row and its blob. Drizzle pattern:

```ts
import { aliasedTable } from "drizzle-orm";

const m = aliasedTable(schema.stockMedia, "m0");
const b = aliasedTable(schema.stockBlob, "b0");

const rows = await getDb()
  .select({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    kind: c.kind,
    classes: c.classes,
    category: c.category,
    installCount: c.installCount,
    reactionCounts: c.reactionCounts,
    lastActivityAt: c.lastActivityAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    authorId: c.authorUserId,
    thumbnailSha: m.blobSha256,
    thumbnailWidth: b.width,
    thumbnailHeight: b.height,
  })
  .from(c)
  .leftJoin(m, and(eq(m.creationId, c.id), eq(m.order, 0)))
  .leftJoin(b, eq(b.sha256, m.blobSha256))
  .where(and(...conditions))
  .orderBy(...orderBy)
  .limit(limit + 1);
```

Update the `ListItem` type (and the exported `StockListItem` consumers) so the three fields are explicit and nullable. The downstream `items.map(...)` block stays the same — `r.thumbnailSha`/`Width`/`Height` flow through.

- [ ] **Step 5: Run tests, see them pass**

Run: `cd api && pnpm test:run stock-read-routes stock-read-service`
Expected: PASS, including the existing sort/cursor tests (the join is left, doesn't change row count).

- [ ] **Step 6: Commit**

```bash
git add api/src/services/stock-read.ts api/test/stock-read-routes.test.ts
git commit -s -m "feat(stock): include thumbnail in list payload"
```

---

## Task 6: Frontend types + `useStockApi` extensions

**Goal:** Type-safe access to the new fields and endpoints.

**Files:**

- Modify: `app/lib/types/stock.ts`
- Modify: `app/composables/useStockApi.ts`

**Acceptance Criteria:**

- [ ] `StockListItem` has `thumbnailSha`, `thumbnailWidth`, `thumbnailHeight` (all nullable).
- [ ] `useStockApi().create` accepts `media?: MediaInput[]`.
- [ ] `useStockApi().replaceMedia(slug, media)` exists and PUTs to the new route.
- [ ] `pnpm lint && pnpm build` passes.

**Verify:** `pnpm lint && pnpm build` → no errors.

**Steps:**

- [ ] **Step 1: Extend `StockListItem`**

In `app/lib/types/stock.ts`, modify `StockListItem`:

```ts
export interface StockListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: StockKind;
  classes: StockClass[];
  category: StockCategory;
  installCount: number;
  reactionCounts: StockReactionCounts & { total: number };
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  thumbnailSha: string | null;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
}
```

- [ ] **Step 2: Extend API client**

In `app/composables/useStockApi.ts`, add a media input type and extend:

```ts
export interface MediaInput {
  blobSha256: string;
  caption: string | null;
}

export interface CreateInput {
  title: string;
  kind: StockKind;
  category: StockCategory;
  classes?: StockClass[];
  description?: string;
  media?: MediaInput[];
}
```

Inside the returned object, add:

```ts
replaceMedia: (slug: string, media: MediaInput[]) =>
  request<{ ok: true }>(`/v1/stock/${slug}/media`, jsonInit('PUT', { media })),
```

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm build`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add app/lib/types/stock.ts app/composables/useStockApi.ts
git commit -s -m "feat(stock): client types and api for media"
```

---

## Task 7: `ScreenshotsEditor.vue` shared component

**Goal:** A self-contained editor that owns the local list of `{ blobSha256, caption, previewUrl? }` rows, exposes `v-model` for the parent.

**Files:**

- Create: `app/components/stock/ScreenshotsEditor.vue`

**Acceptance Criteria:**

- [ ] Accepts initial `modelValue: Array<{ blobSha256: string, caption: string | null }>` and emits `update:modelValue` on every change.
- [ ] File picker + drop zone that POSTs each image to `/uploads` via `useStockApi().upload`.
- [ ] Inline caption text input (200 char cap, displayed counter).
- [ ] Drag handle on each row reorders via HTML5 DnD.
- [ ] Remove button per row.
- [ ] Disables the "add" UI when length is at the 8-image cap.
- [ ] Shows a thumbnail preview from `URL.createObjectURL(file)` while the upload is in flight; swaps to `blobUrl(sha)` after success.
- [ ] Tokens only (`--color-*`, `--font-mono` etc.), no hardcoded colors.

**Verify:** `pnpm lint && pnpm build` succeeds, and `pnpm dev` → visit `/stock/new`, the section renders with the picker disabled (until wired in Task 8).

**Steps:**

- [ ] **Step 1: Create the component**

Create `app/components/stock/ScreenshotsEditor.vue`:

```vue
<script setup lang="ts">
import type { MediaInput } from "~/composables/useStockApi";

interface Row {
  blobSha256: string;
  caption: string;
  previewUrl: string | null;
  uploading: boolean;
}

const props = defineProps<{
  modelValue: MediaInput[];
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: MediaInput[]): void;
}>();

const MAX = 8;
const CAPTION_MAX = 200;

const api = useStockApi();
const rows = ref<Row[]>(
  props.modelValue.map((m) => ({
    blobSha256: m.blobSha256,
    caption: m.caption ?? "",
    previewUrl: null,
    uploading: false,
  })),
);
const error = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const dragIndex = ref<number | null>(null);

watch(
  rows,
  (next) => {
    emit(
      "update:modelValue",
      next.map((r) => ({
        blobSha256: r.blobSha256,
        caption: r.caption.trim() === "" ? null : r.caption,
      })),
    );
  },
  { deep: true },
);

async function addFiles(files: FileList | null) {
  if (!files) return;
  error.value = null;
  const room = MAX - rows.value.length;
  const list = Array.from(files).slice(0, room);
  for (const file of list) {
    const previewUrl = URL.createObjectURL(file);
    const row: Row = {
      blobSha256: "",
      caption: "",
      previewUrl,
      uploading: true,
    };
    rows.value.push(row);
    try {
      const { sha256 } = await api.upload(file);
      row.blobSha256 = sha256;
      row.uploading = false;
    } catch (e) {
      error.value = (e as Error).message;
      rows.value = rows.value.filter((r) => r !== row);
      URL.revokeObjectURL(previewUrl);
    }
  }
}

function remove(i: number) {
  const r = rows.value[i];
  if (r.previewUrl) URL.revokeObjectURL(r.previewUrl);
  rows.value.splice(i, 1);
}

function onDragStart(i: number) {
  dragIndex.value = i;
}
function onDragOver(e: DragEvent) {
  e.preventDefault();
}
function onDrop(i: number) {
  const from = dragIndex.value;
  dragIndex.value = null;
  if (from === null || from === i) return;
  const [moved] = rows.value.splice(from, 1);
  rows.value.splice(i, 0, moved);
}

function thumbFor(r: Row): string {
  return r.previewUrl ?? api.blobUrl(r.blobSha256);
}

onBeforeUnmount(() => {
  for (const r of rows.value) {
    if (r.previewUrl) URL.revokeObjectURL(r.previewUrl);
  }
});
</script>

<template>
  <div class="ed">
    <ul v-if="rows.length" class="rows">
      <li
        v-for="(r, i) in rows"
        :key="i"
        class="row"
        :class="{ uploading: r.uploading }"
        draggable="true"
        @dragstart="onDragStart(i)"
        @dragover="onDragOver"
        @drop="onDrop(i)"
      >
        <span class="handle" aria-hidden="true">≡</span>
        <img class="thumb" :src="thumbFor(r)" alt="" />
        <input
          v-model="r.caption"
          class="cap"
          type="text"
          :maxlength="CAPTION_MAX"
          placeholder="caption (optional)"
        />
        <span class="counter">{{ r.caption.length }}/{{ CAPTION_MAX }}</span>
        <button type="button" class="rm" @click="remove(i)">remove</button>
      </li>
    </ul>
    <div class="add">
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        hidden
        @change="addFiles(($event.target as HTMLInputElement).files)"
      />
      <button
        type="button"
        class="btn-add"
        :disabled="rows.length >= MAX"
        @click="fileInput?.click()"
      >
        {{
          rows.length >= MAX ? `Max ${MAX} screenshots` : "+ Add screenshots"
        }}
      </button>
    </div>
    <p v-if="error" class="err">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.ed {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: grid;
  grid-template-columns: 16px 64px 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}
.row.uploading {
  opacity: 0.6;
}
.handle {
  color: var(--color-faint);
  cursor: grab;
  user-select: none;
}
.thumb {
  width: 64px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  background: var(--color-bg);
}
.cap {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 6px 8px;
  font: 13px/1.4 var(--font-sans);
}
.counter {
  font: 500 11px/1 var(--font-mono);
  color: var(--color-faint);
}
.rm {
  font: 600 11px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
}
.rm:hover {
  color: var(--color-text);
}
.btn-add {
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
  border: 1px dashed var(--color-accent);
  border-radius: 6px;
  padding: 10px 16px;
  cursor: pointer;
}
.btn-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-style: solid;
}
.err {
  margin: 0;
  font-size: 13px;
  color: oklch(70% 0.18 25);
}
</style>
```

- [ ] **Step 2: Lint and build**

Run: `pnpm lint && pnpm build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/stock/ScreenshotsEditor.vue
git commit -s -m "feat(stock): ScreenshotsEditor component"
```

---

## Task 8: Wire `ScreenshotsEditor` into `/stock/new`

**Goal:** Optional screenshots section on the create page; passes `media` into `api.create()`.

**Files:**

- Modify: `app/pages/stock/new.vue`

**Acceptance Criteria:**

- [ ] A "Screenshots" section renders below the existing details block.
- [ ] Selecting images uploads them via `/uploads`.
- [ ] Submitting the form creates the draft with the chosen media attached.
- [ ] Submitting with zero screenshots still works (existing behavior preserved).
- [ ] After successful create, user is redirected to `/stock/<slug>/edit` (unchanged).

**Verify:** `pnpm dev` → `/stock/new`, attach 2 images, submit, land on edit, screenshots present.

**Steps:**

- [ ] **Step 1: Edit `pages/stock/new.vue`**

Add to the `<script setup>` imports and state:

```ts
import type { MediaInput } from "~/composables/useStockApi";
import ScreenshotsEditor from "~/components/stock/ScreenshotsEditor.vue";

const media = ref<MediaInput[]>([]);
```

Change the `submit()` body to pass media:

```ts
const { slug } = await api.create({ ...form, media: media.value });
```

In the `<template>`, after the existing Details `<section>`, add:

```html
<section class="block">
  <h2 class="kicker block-head">Screenshots</h2>
  <p class="field-hint">
    Up to 8 images, max 2 MB each. PNG, JPEG, WebP, or GIF.
  </p>
  <ScreenshotsEditor v-model="media" />
</section>
```

- [ ] **Step 2: Lint, build, manual smoke**

Run: `pnpm lint && pnpm build`
Expected: no errors.
Then `pnpm dev`, sign in, go to `/stock/new`, attach images, submit, confirm redirect and that `/stock/<slug>` (or `/edit`) shows the screenshots.

- [ ] **Step 3: Commit**

```bash
git add app/pages/stock/new.vue
git commit -s -m "feat(stock): screenshots on create form"
```

---

## Task 9: Wire `ScreenshotsEditor` into `/stock/[slug]/edit`

**Goal:** Edit existing media via the same component; explicit save button calls `replaceMedia`.

**Files:**

- Modify: `app/pages/stock/[slug]/edit.vue`

**Acceptance Criteria:**

- [ ] On load, the editor is seeded with `creation.media` mapped to `{ blobSha256, caption }`.
- [ ] A "Save screenshots" button submits the current list via `api.replaceMedia(slug, media)`.
- [ ] Save shows a transient confirmation (or disables itself while in flight) and reflects server changes in the page (refetch or update the local copy).
- [ ] Cap of 8 is enforced by the shared component (no extra logic needed here).

**Verify:** `pnpm dev` → `/stock/<slug>/edit`, add image, save, reload page, image persists.

**Steps:**

- [ ] **Step 1: Locate the edit page section list**

Open `app/pages/stock/[slug]/edit.vue` and find where existing edit sections (title, description, parts) are rendered.

- [ ] **Step 2: Add the screenshots block**

In `<script setup>`:

```ts
import type { MediaInput } from "~/composables/useStockApi";
import ScreenshotsEditor from "~/components/stock/ScreenshotsEditor.vue";

const media = ref<MediaInput[]>(
  (creation.value?.media ?? []).map((m) => ({
    blobSha256: m.blobSha256,
    caption: m.caption ?? null,
  })),
);
const savingMedia = ref(false);
const mediaError = ref<string | null>(null);

async function saveMedia() {
  if (savingMedia.value) return;
  savingMedia.value = true;
  mediaError.value = null;
  try {
    await api.replaceMedia(slug.value, media.value);
    await refreshCreation(); // existing reactive refetch helper; if unnamed, re-call useFetch / inline fetch
  } catch (e) {
    mediaError.value = (e as Error).message;
  } finally {
    savingMedia.value = false;
  }
}
```

(Adjust to whatever the existing edit page uses for `creation`, `slug`, and refresh — the imports above name the new state; the existing patterns are not rewritten.)

In the template:

```html
<section class="block">
  <h2 class="kicker block-head">Screenshots</h2>
  <ScreenshotsEditor v-model="media" />
  <div class="row-actions">
    <button
      type="button"
      class="btn-primary"
      :disabled="savingMedia"
      @click="saveMedia"
    >
      {{ savingMedia ? 'Saving…' : 'Save screenshots' }}
    </button>
    <p v-if="mediaError" class="error">{{ mediaError }}</p>
  </div>
</section>
```

- [ ] **Step 3: Lint, build, manual smoke**

Run: `pnpm lint && pnpm build`
Then `pnpm dev`, open an owned creation in edit, add and reorder a few images, save, reload, confirm the order persists.

- [ ] **Step 4: Commit**

```bash
git add app/pages/stock/\[slug\]/edit.vue
git commit -s -m "feat(stock): screenshots editor on edit page"
```

---

## Task 10: Card thumbnails on `/stock`

**Goal:** Render the first image as a thumbnail above the card content when `thumbnailSha` is present; no layout shift.

**Files:**

- Modify: `app/components/stock/StockCard.vue`

**Acceptance Criteria:**

- [ ] Cards with `thumbnailSha` show an `<img>` above the title.
- [ ] When `width`/`height` are non-null, `<img>` receives them so the browser reserves space.
- [ ] When `width`/`height` are null, CSS `aspect-ratio: 16 / 10; object-fit: cover` still avoids layout shift.
- [ ] Cards without media render unchanged.
- [ ] `<img>` has `loading="lazy"` and `decoding="async"`.

**Verify:** `pnpm dev` → `/stock`, mixed cards (some with media, some without) render correctly. No console errors.

**Steps:**

- [ ] **Step 1: Edit `StockCard.vue`**

Add to `<script setup>`:

```ts
const api = useStockApi();
```

In the template, at the top of the card body, conditionally render:

```html
<img
  v-if="item.thumbnailSha"
  class="card-thumb"
  :src="api.blobUrl(item.thumbnailSha)"
  :width="item.thumbnailWidth ?? undefined"
  :height="item.thumbnailHeight ?? undefined"
  loading="lazy"
  decoding="async"
  alt=""
/>
```

Add styles:

```css
.card-thumb {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
  border-radius: 6px 6px 0 0;
  background: var(--color-bg);
}
```

- [ ] **Step 2: Lint, build, manual smoke**

Run: `pnpm lint && pnpm build && pnpm dev`
Visit `/stock`, confirm cards with media show thumbnails and cards without are visually unchanged.

- [ ] **Step 3: Commit**

```bash
git add app/components/stock/StockCard.vue
git commit -s -m "feat(stock): card thumbnail from first media"
```

---

## Final verification

Run end-to-end:

```bash
pnpm lint
pnpm build
pnpm test:run
cd api && pnpm test:run
```

All four should pass with no skips or warnings introduced by this change.
