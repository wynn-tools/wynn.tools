import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { EQUIP_SLOT_COUNT } from '~/lib/builder-draft/routing'

/**
 * The items-page build draft: a lightweight slot → item-id map the user fills
 * by equipping from search. It is independent of any /builder/[hash] build and
 * survives reloads via localStorage. Opening the full builder "promotes" this
 * draft into the real build store (see useBuilderPromote).
 */

const STORAGE_KEY = 'wynn.tools:builder-draft'

interface PersistedDraft {
  gameVersion: string | null
  slots: Array<number | null>
}

function emptySlots(): Array<number | null> {
  return Array.from({ length: EQUIP_SLOT_COUNT }).fill(null)
}

function load(): PersistedDraft {
  if (typeof window === 'undefined')
    return { gameVersion: null, slots: emptySlots() }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return { gameVersion: null, slots: emptySlots() }
    const parsed = JSON.parse(raw) as Partial<PersistedDraft>
    const slots = emptySlots()
    if (Array.isArray(parsed.slots)) {
      for (let i = 0; i < EQUIP_SLOT_COUNT; i++) {
        const v = parsed.slots[i]
        slots[i] = typeof v === 'number' ? v : null
      }
    }
    return { gameVersion: typeof parsed.gameVersion === 'string' ? parsed.gameVersion : null, slots }
  }
  catch {
    return { gameVersion: null, slots: emptySlots() }
  }
}

export const useBuilderDraftStore = defineStore('builderDraft', () => {
  const initial = load()
  const slots = ref<Array<number | null>>(initial.slots)
  /** Game-data version the stored ids belong to; used to detect staleness. */
  const gameVersion = ref<string | null>(initial.gameVersion)

  const count = computed(() => slots.value.reduce((n, id) => n + (id != null ? 1 : 0), 0))
  const isEmpty = computed(() => count.value === 0)

  // Persistence stays off until the client has hydrated from localStorage. This
  // prevents the SSR hydration pass (which sets this store to the server's empty
  // state and would fire the persist watcher) from clobbering the saved draft
  // before `hydrate()` runs on mount.
  let hydrated = false

  function persist() {
    if (typeof window === 'undefined' || !hydrated)
      return
    try {
      const data: PersistedDraft = { gameVersion: gameVersion.value, slots: slots.value }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
    catch {
      // Storage unavailable (private mode, quota) — degrade to session-only.
    }
  }

  watch([slots, gameVersion], persist, { deep: true })

  /** Place an item id into a specific slot. Returns the displaced id, if any. */
  function equipToSlot(slot: number, id: number): number | null {
    if (slot < 0 || slot >= EQUIP_SLOT_COUNT)
      return null
    const prev = slots.value[slot] ?? null
    const next = slots.value.slice()
    next[slot] = id
    slots.value = next
    return prev
  }

  /** Bulk replace all slots in one assignment (single persist, no churn). */
  function setSlots(next: Array<number | null>) {
    const normalized = emptySlots()
    for (let i = 0; i < EQUIP_SLOT_COUNT; i++) normalized[i] = next[i] ?? null
    // Skip if unchanged to avoid a redundant write.
    if (normalized.every((id, i) => id === slots.value[i]))
      return
    slots.value = normalized
  }

  /** Low-level slot write, used for undo. */
  function setSlot(slot: number, id: number | null) {
    if (slot < 0 || slot >= EQUIP_SLOT_COUNT)
      return
    const next = slots.value.slice()
    next[slot] = id
    slots.value = next
  }

  /** Clear a slot. Returns the removed id, if any. */
  function removeSlot(slot: number): number | null {
    if (slot < 0 || slot >= EQUIP_SLOT_COUNT)
      return null
    const prev = slots.value[slot] ?? null
    if (prev == null)
      return null
    setSlot(slot, null)
    return prev
  }

  function clear() {
    slots.value = emptySlots()
  }

  /**
   * Re-read the persisted draft from localStorage. Must be called on the client
   * after mount: under SSR, Pinia hydrates this store with the server's empty
   * state, which would otherwise clobber the setup-time read.
   */
  function hydrate() {
    const data = load()
    slots.value = data.slots
    gameVersion.value = data.gameVersion
    // From here on, mutations persist. (Reading first, enabling after, means the
    // hydration assignment above can't be the thing that overwrites storage.)
    hydrated = true
  }

  /**
   * Drop any stored id that no longer resolves against current data (e.g. after
   * a game-data version bump). Mirrors the build store's upgrade behaviour.
   */
  function reconcile(isValidId: (id: number) => boolean, currentGameVersion: string | null) {
    gameVersion.value = currentGameVersion
    let changed = false
    const next = slots.value.map((id) => {
      if (id != null && !isValidId(id)) {
        changed = true
        return null
      }
      return id
    })
    if (changed)
      slots.value = next
  }

  return { slots, gameVersion, count, isEmpty, equipToSlot, setSlot, setSlots, removeSlot, clear, hydrate, reconcile }
})
