import type { JoinedWorldEvent, WorldEventSort } from './types'

export function sortWorldEvents(
  events: ReadonlyArray<JoinedWorldEvent>,
  sort: WorldEventSort,
  nowMs: number,
): JoinedWorldEvent[] {
  const arr = events.slice()
  if (sort === 'name') {
    arr.sort((a, b) => a.event.name.localeCompare(b.event.name))
  }
  else if (sort === 'level') {
    arr.sort((a, b) => a.event.level - b.event.level || a.event.name.localeCompare(b.event.name))
  }
  else {
    arr.sort((a, b) => {
      const at = a.event.schedule ? Date.parse(a.event.schedule) : Number.POSITIVE_INFINITY
      const bt = b.event.schedule ? Date.parse(b.event.schedule) : Number.POSITIVE_INFINITY
      const af = at >= nowMs ? at : Number.POSITIVE_INFINITY
      const bf = bt >= nowMs ? bt : Number.POSITIVE_INFINITY
      return af - bf || a.event.name.localeCompare(b.event.name)
    })
  }
  return arr
}
