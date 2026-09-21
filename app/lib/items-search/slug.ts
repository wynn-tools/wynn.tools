import type { SearchItem } from './types'

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function itemSlug(item: Pick<SearchItem, 'displayName'>): string {
  return slugify(item.displayName)
}

export function buildSlugIndex(items: SearchItem[]): Map<string, SearchItem[]> {
  const index = new Map<string, SearchItem[]>()
  for (const item of items) {
    const slug = itemSlug(item)
    const bucket = index.get(slug)
    if (bucket)
      bucket.push(item)
    else
      index.set(slug, [item])
  }
  for (const item of items) {
    const legacy = slugify(item.name)
    if (!index.has(legacy))
      index.set(legacy, [item])
  }
  return index
}

export function resolveSlug(
  index: Map<string, SearchItem[]>,
  slug: string,
): SearchItem | undefined {
  return index.get(slug)?.[0]
}
