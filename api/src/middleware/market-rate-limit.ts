import type { MiddlewareHandler } from 'hono'
import { AppError } from '../lib/errors'

interface Options { limit: number, windowMs: number }

// Factory: each call gets its own bucket map, so a fresh createApp() (and each
// test) starts clean. Keyed by client IP from x-forwarded-for.
export function ipRateLimit(opts: Options): MiddlewareHandler {
  const buckets = new Map<string, number[]>()
  return async (c, next) => {
    const ip = (c.req.header('x-forwarded-for') ?? '').split(',')[0]!.trim() || 'unknown'
    const now = Date.now()
    const windowStart = now - opts.windowMs
    const hits = (buckets.get(ip) ?? []).filter(t => t > windowStart)
    if (hits.length >= opts.limit)
      throw new AppError(429, 'rate_limited', 'Rate limit exceeded')
    hits.push(now)
    buckets.set(ip, hits)
    await next()
  }
}
