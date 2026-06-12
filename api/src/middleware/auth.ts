import type { Context, MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { env } from '../env'
import { AppError } from '../lib/errors'
import { verifyApiKey } from '../services/api-keys'
import { getSessionUser } from '../services/sessions'

export interface AuthUser { id: string, username: string, avatar: string | null, isAdmin: boolean }
export interface Auth { user: AuthUser, capabilities: string[] }

declare module 'hono' {
  interface ContextVariableMap { auth: Auth }
}

export function hasScope(auth: Auth, scope: string): boolean {
  return auth.capabilities.includes('*') || auth.capabilities.includes(scope)
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const auth = await resolveAuth(c)
  if (!auth)
    throw new AppError(401, 'unauthorized', 'Authentication required')
  c.set('auth', auth)
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)
  const usedBearer = /^Bearer /i.test(c.req.header('authorization') ?? '')
  if (isMutation && !usedBearer) {
    const origin = c.req.header('origin')
    if (origin && origin !== env().FRONTEND_URL)
      throw new AppError(403, 'csrf', 'Cross-origin request rejected')
  }
  await next()
}

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  await requireAuth(c, async () => {
    const auth = c.get('auth')
    if (!auth.user.isAdmin)
      throw new AppError(403, 'forbidden', 'admin required')
    await next()
  })
}

async function resolveAuth(c: Context): Promise<Auth | null> {
  const bearer = c.req.header('authorization')?.match(/^Bearer (\S+)$/i)?.[1]
  if (bearer) {
    const verified = await verifyApiKey(bearer)
    if (!verified)
      return null
    const u = verified.user
    if (u.bannedAt)
      return null
    return {
      user: { id: u.id, username: u.username, avatar: u.avatar, isAdmin: !!u.isAdmin },
      capabilities: verified.scopes,
    }
  }
  const token = getCookie(c, 'session')
  if (token) {
    const u = await getSessionUser(token)
    if (u && !u.bannedAt) {
      return {
        user: { id: u.id, username: u.username, avatar: u.avatar, isAdmin: !!u.isAdmin },
        capabilities: ['*'],
      }
    }
  }
  return null
}
