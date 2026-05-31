import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useBuilderDraftStore } from './builderDraft'

const STORAGE_KEY = 'wynn.tools:builder-draft'

function mockStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  }
}

describe('builderDraft persistence', () => {
  let store: ReturnType<typeof mockStorage>

  beforeEach(() => {
    store = mockStorage()
    // The store reads/writes window.localStorage; provide both.
    vi.stubGlobal('window', { localStorage: store })
    vi.stubGlobal('localStorage', store)
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not write before hydration (guards against SSR clobber)', async () => {
    const draft = useBuilderDraftStore()
    draft.setSlot(0, 1234)
    await nextTick()
    expect(store.getItem(STORAGE_KEY)).toBeNull()
  })

  it('writes slots to localStorage after hydration', async () => {
    const draft = useBuilderDraftStore()
    draft.hydrate()
    draft.setSlot(0, 1234)
    await nextTick()
    const raw = store.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).slots[0]).toBe(1234)
  })

  it('persists via equipToSlot and setSlots too', async () => {
    const draft = useBuilderDraftStore()
    draft.hydrate()
    draft.equipToSlot(8, 99)
    await nextTick()
    expect(JSON.parse(store.getItem(STORAGE_KEY)!).slots[8]).toBe(99)

    draft.setSlots([5, null, null, null, null, null, null, null, null])
    await nextTick()
    expect(JSON.parse(store.getItem(STORAGE_KEY)!).slots[0]).toBe(5)
  })

  it('hydrates restored slots from localStorage', () => {
    store.setItem(STORAGE_KEY, JSON.stringify({ gameVersion: '2.2.0', slots: [7, null, null, null, null, null, null, null, null] }))
    const draft = useBuilderDraftStore()
    draft.hydrate()
    expect(draft.slots[0]).toBe(7)
  })
})
