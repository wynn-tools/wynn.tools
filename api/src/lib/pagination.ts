import { Buffer } from 'node:buffer'

export type CursorData
  = | { c: string, id: string }
    | { n: string, id: string }

export function encodeCursor(c: CursorData): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url')
}

export function decodeCursor(raw: string | undefined): CursorData | null {
  if (!raw)
    return null
  try {
    const obj = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (typeof obj !== 'object' || obj === null || typeof obj.id !== 'string')
      return null
    if ('c' in obj && typeof obj.c === 'string')
      return { c: obj.c, id: obj.id }
    if ('n' in obj && typeof obj.n === 'string')
      return { n: obj.n, id: obj.id }
    return null
  }
  catch {
    return null
  }
}

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
