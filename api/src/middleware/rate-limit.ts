import type { MiddlewareHandler } from 'hono'
import { AppError } from '../lib/errors'

interface Options { limit: number, windowMs: number }
const buckets = new Map<string, number[]>() // bearer token -> request timestamps

export function rateLimit(opts: Options): MiddlewareHandler {
  return async (c, next) => {
    const bearer = c.req.header('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
    if (!bearer) {
      await next()
      return
    }
    const now = Date.now()
    const windowStart = now - opts.windowMs
    const hits = (buckets.get(bearer) ?? []).filter(t => t > windowStart)

    if (hits.length >= opts.limit) {
      const retryMs = hits[0] + opts.windowMs - now
      c.header('Retry-After', String(Math.ceil(retryMs / 1000)))
      c.header('RateLimit-Limit', String(opts.limit))
      c.header('RateLimit-Remaining', '0')
      throw new AppError(429, 'rate_limited', 'Rate limit exceeded')
    }

    hits.push(now)
    buckets.set(bearer, hits)
    c.header('RateLimit-Limit', String(opts.limit))
    c.header('RateLimit-Remaining', String(opts.limit - hits.length))
    await next()
  }
}
