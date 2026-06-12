import type { ItemSourcesFile, SourceEntry } from './types'

export function sourcesForItem(itemName: string, file: ItemSourcesFile): SourceEntry[] {
  return file.items[itemName] ?? []
}
