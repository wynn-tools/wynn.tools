export interface MobSource {
  wiki: string
  drops: { guaranteed: string[], exclusive: string[] }
}

export interface ItemSourcesFile {
  mobs: Record<string, MobSource>
}

export interface MobDropRef {
  mob: string
  wiki: string
  kind: 'guaranteed' | 'exclusive'
}
