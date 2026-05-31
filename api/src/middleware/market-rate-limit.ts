import type { MiddlewareHandler } from 'hono'
import { AppError } from '../lib/errors'

interface Options { limit: number, windowMs: number }

// Process-wide per-IP limiter: the bucket Map lives in this closure, and the
// `market` Hono instance that installs it is a module singleton — so buckets are
// shared across all requests in the process (the desired production behavior).
// Keyed by the first hop of x-forwarded-for.
export function ipRateLimit(opts: Options): MiddlewareHandler {
  const buckets = new Map<string, number[]>()
  return async (c, next) => {
    const ip = (c.req.header('x-forwarded-for') ?? '').split(',')[0]!.trim() || 'unknown'
    const now = Date.now()
    const windowStart = now - opts.windowMs
    const hits = (buckets.get(ip) ?? []).filter(t => t > windowStart)

    if (hits.length >= opts.limit) {
      const retryMs = hits[0]! + opts.windowMs - now
      c.header('Retry-After', String(Math.ceil(retryMs / 1000)))
      c.header('RateLimit-Limit', String(opts.limit))
      c.header('RateLimit-Remaining', '0')
      throw new AppError(429, 'rate_limited', 'Rate limit exceeded')
    }

    hits.push(now)
    buckets.set(ip, hits)
    c.header('RateLimit-Limit', String(opts.limit))
    c.header('RateLimit-Remaining', String(opts.limit - hits.length))
    await next()
  }
}
