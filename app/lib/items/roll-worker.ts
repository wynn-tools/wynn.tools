import type { RequirementSet, RolledItem, RollOptions } from './roll-simulator'
import type { IdRange } from '~/lib/items-search/types'
import { meetsRequirements, rollItem } from './roll-simulator'

export interface WorkerStartMessage {
  type: 'start'
  workerId: number
  base: Record<string, IdRange>
  options: Omit<RollOptions, 'rand'>
  requirements: RequirementSet
  progressEvery: number
}

export interface WorkerProgressMessage {
  type: 'progress'
  workerId: number
  attempts: number
  item: RolledItem
}
export interface WorkerSuccessMessage {
  type: 'success'
  workerId: number
  attempts: number
  item: RolledItem
}
export interface WorkerStoppedMessage {
  type: 'stopped'
  workerId: number
  attempts: number
  item: RolledItem | null
}

export type WorkerOutbound = WorkerProgressMessage | WorkerSuccessMessage | WorkerStoppedMessage
export type WorkerInbound = WorkerStartMessage | 'stop'

let cancelled = false

globalThis.onmessage = (e: MessageEvent<WorkerInbound>) => {
  if (e.data === 'stop') {
    cancelled = true
    return
  }
  cancelled = false
  const msg = e.data
  let attempts = 0
  let last: RolledItem | null = null

  // eslint-disable-next-line no-unmodified-loop-condition
  while (!cancelled) {
    const item = rollItem(msg.base, msg.options)
    last = item
    attempts++
    if (meetsRequirements(item, msg.requirements)) {
      const out: WorkerSuccessMessage = { type: 'success', workerId: msg.workerId, attempts, item }
      globalThis.postMessage(out)
      return
    }
    if (attempts % msg.progressEvery === 0) {
      const out: WorkerProgressMessage = { type: 'progress', workerId: msg.workerId, attempts, item }
      globalThis.postMessage(out)
    }
  }
  const out: WorkerStoppedMessage = { type: 'stopped', workerId: msg.workerId, attempts, item: last }
  globalThis.postMessage(out)
}
