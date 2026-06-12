export type StockKind = 'infobox' | 'custom-bar' | 'bundle'
export type StockClass = 'mage' | 'archer' | 'warrior' | 'shaman' | 'assassin'
export type StockCategory
  = | 'combat'
    | 'party-ui'
    | 'raid'
    | 'lootrun'
    | 'dps-meter'
    | 'cooldown-tracker'
    | 'resource-tracker'
    | 'qol'
export type StockPartRole = 'function' | 'infobox' | 'resourcepack'
export type StockEmoji = 'thumbs_up' | 'fire' | 'art' | 'bug'
export type StockSort
  = | 'latest-activity'
    | 'most-installed'
    | 'most-reacted'
    | 'newest'
    | 'recently-updated'

export interface StockReactionCounts {
  thumbs_up: number
  fire: number
  art: number
  bug: number
}

export interface StockAuthor {
  id: string
  discordId: string
  username: string
  displayName: string | null
  avatar: string | null
}

export interface StockPart {
  id: string
  order: number
  role: StockPartRole
  name: string
  description: string | null
  group: string | null
  textContent: string | null
  blobSha256: string | null
  blobFilename: string | null
}

export interface StockVersion {
  id: string
  number: number
  label: string
  changelog: string
  status: 'draft' | 'published'
  publishedAt: string | null
  createdAt: string
  parts: StockPart[]
}

export interface StockListItem {
  id: string
  slug: string
  title: string
  description: string
  kind: StockKind
  classes: StockClass[]
  category: StockCategory
  installCount: number
  reactionCounts: StockReactionCounts & { total: number }
  lastActivityAt: string
  createdAt: string
  updatedAt: string
  authorId: string
  thumbnailSha: string | null
  thumbnailWidth: number | null
  thumbnailHeight: number | null
}

export interface StockMedia {
  id: string
  order: number
  blobSha256: string
  caption: string | null
}

export interface StockCreation extends StockListItem {
  creditsNote: string
  discordThreadId: string | null
  author: StockAuthor
  media: StockMedia[]
  latestVersion: StockVersion | null
}
