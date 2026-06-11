import { Buffer } from 'node:buffer'
import { Hono } from 'hono'
import { getDb, schema } from '../db/client'
import { AppError } from '../lib/errors'
import { hasScope, requireAuth } from '../middleware/auth'
import { writeBlob } from '../services/blob-store'
import { sniffImageMime } from '../services/stock-image-guard'
import { assertSafeZip } from '../services/stock-zip-guard'

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const ZIP_LIMITS = {
  maxCompressed: MAX_UPLOAD_BYTES,
  maxUncompressed: 60 * 1024 * 1024,
}
const IMAGE_MAX = 2 * 1024 * 1024

export const stock = new Hono()

stock.post('/uploads', requireAuth, async (c) => {
  const auth = c.get('auth')
  const usedBearer = /^Bearer /i.test(c.req.header('authorization') ?? '')
  if (usedBearer && !hasScope(auth, 'stock:write'))
    throw new AppError(403, 'forbidden', 'stock:write scope required')

  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File))
    throw new AppError(400, 'bad_request', 'file field required')

  if (file.size > MAX_UPLOAD_BYTES)
    throw new AppError(413, 'too_large', `max upload is ${MAX_UPLOAD_BYTES} bytes`)

  const buf = Buffer.from(await file.arrayBuffer())
  let mimeType: string

  const image = sniffImageMime(buf)
  if (image) {
    if (buf.length > IMAGE_MAX)
      throw new AppError(413, 'too_large', `image max is ${IMAGE_MAX} bytes`)
    mimeType = image
  }
  else {
    try {
      assertSafeZip(buf, ZIP_LIMITS)
      mimeType = 'application/zip'
    }
    catch (err) {
      throw new AppError(415, 'unsupported_media', (err as Error).message)
    }
  }

  const { sha256, byteSize } = await writeBlob(buf)
  await getDb().insert(schema.stockBlob).values({
    sha256,
    byteSize,
    mimeType,
    originalFilename: file.name || 'upload',
    refCount: 0,
  }).onConflictDoNothing({ target: schema.stockBlob.sha256 })

  return c.json({ sha256, byteSize, mimeType })
})
