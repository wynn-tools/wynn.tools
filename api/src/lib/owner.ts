import type { schema } from '../db/client'

type User = typeof schema.users.$inferSelect

export interface OwnerInfo {
  id: string
  name: string
  discordId: string
  avatar: string | null
}

export function resolveOwner(user: User | null | undefined): OwnerInfo | null {
  if (!user || user.profileVisibility === 'private')
    return null
  return {
    id: user.id,
    name: user.displayName ?? user.username,
    discordId: user.discordId,
    avatar: user.avatar,
  }
}
