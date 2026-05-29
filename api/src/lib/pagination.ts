import { Buffer } from 'node:buffer'

export interface Cursor { createdAt: Date, id: string }

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.createdAt.toISOString()}|${c.id}`).toString('base64url')
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw)
    return null
  try {
    const [iso, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|')
    const createdAt = new Date(iso)
    if (!id || Number.isNaN(createdAt.getTime()))
      return null
    return { createdAt, id }
  }
  catch {
    return null
  }
}

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
