import type { Context } from 'hono'

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export function onError(err: Error, c: Context): Response {
  if (err instanceof AppError)
    return c.json({ error: { code: err.code, message: err.message } }, err.status as 400)

  console.error(err)
  return c.json({ error: { code: 'internal', message: 'Internal server error' } }, 500)
}
