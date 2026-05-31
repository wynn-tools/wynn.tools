import type { SearchItem } from '~/lib/items-search/types'
import { computed, ref } from 'vue'
import { useCdnClient } from '~/composables/useBuildData'
import { useDraftItemIndex } from '~/composables/useDraftItemIndex'
import { useToast } from '~/composables/useToast'
import { SLOT_LABELS, slotsForItem } from '~/lib/builder-draft/routing'
import { slotItemId } from '~/lib/codec/build-codec'
import { useBuildStore } from '~/stores/build'
import { useBuilderDraftStore } from '~/stores/builderDraft'

/**
 * Orchestrates the items-page builder rail. One visible source of truth at a
 * time: while the full builder is closed the rail mirrors the persisted draft
 * and `+ Equip` writes to it; while open it mirrors the live build store.
 * Opening promotes the draft into the build store; closing snapshots it back.
 *
 * Module-level state makes `open` a singleton shared by the page, the FAB, and
 * the result cards (same pattern as useToast).
 */

export type EquipOutcome = { kind: 'equipped' } | { kind: 'choose-ring', item: SearchItem }

const open = ref(false)
const promoting = ref(false)

// Full in-progress build (ability tree, skillpoints, powders, tomes, aspects,
// everything the panel edits) persisted as an encoded build hash so it survives
// a page reload. The lightweight collapsed rail still reads `draft.slots`; this
// hash is only loaded when the panel is (re)opened.
const BUILD_KEY = 'wynn.tools:builder-draft-build'

function loadPersistedHash(): string | null {
  if (typeof window === 'undefined')
    return null
  try {
    return window.localStorage.getItem(BUILD_KEY) || null
  }
  catch {
    return null
  }
}

function persistHash(hash: string | null) {
  if (typeof window === 'undefined')
    return
  try {
    if (hash)
      window.localStorage.setItem(BUILD_KEY, hash)
    else
      window.localStorage.removeItem(BUILD_KEY)
  }
  catch {
    // Storage unavailable — degrade to session-only.
  }
}

export function useBuilderRail() {
  const draft = useBuilderDraftStore()
  const build = useBuildStore()
  const { index, gameVersion } = useDraftItemIndex()
  const { push, pushAction } = useToast()

  const usingBuild = computed(() => open.value && build.rawBuild != null)

  /** The nine slot item-ids currently shown in the preview. */
  const previewIds = computed<Array<number | null>>(() =>
    usingBuild.value
      ? build.rawBuild!.equipment.slice(0, SLOT_LABELS.length).map(e => slotItemId(e))
      : draft.slots,
  )

  const count = computed(() => previewIds.value.reduce((n, id) => n + (id != null ? 1 : 0), 0))
  const isEmpty = computed(() => count.value === 0)

  function itemFor(id: number | null): SearchItem | null {
    return id == null ? null : (index.value.get(id) ?? null)
  }
  function nameForId(id: number | null): string {
    return itemFor(id)?.displayName ?? 'item'
  }

  function writeSlot(slot: number, id: number | null) {
    if (usingBuild.value)
      build.setItem(slot, id)
    else
      draft.setSlot(slot, id)
  }

  function commitToSlot(item: SearchItem, slot: number) {
    const prev = previewIds.value[slot] ?? null
    if (prev === item.id) {
      push('info', `${item.displayName} is already in ${SLOT_LABELS[slot]}`)
      return
    }
    writeSlot(slot, item.id)
    const verb = prev != null ? `replaced ${nameForId(prev)}` : null
    pushAction(
      'info',
      verb ? `Equipped ${item.displayName}, ${verb}` : `Equipped ${item.displayName} in ${SLOT_LABELS[slot]}`,
      { label: 'Undo', run: () => writeSlot(slot, prev) },
    )
  }

  /**
   * Single-slot items auto-route. Rings auto-fill the first empty ring slot and
   * only hand back to the caller (to ask which to replace) when both are full.
   */
  function equip(item: SearchItem): EquipOutcome {
    const match = slotsForItem(item)
    if (match.slots.length === 0)
      return { kind: 'equipped' }
    if (match.ambiguous) {
      const empty = match.slots.find(slot => previewIds.value[slot] == null)
      if (empty != null) {
        commitToSlot(item, empty)
        return { kind: 'equipped' }
      }
      return { kind: 'choose-ring', item }
    }
    commitToSlot(item, match.slots[0]!)
    return { kind: 'equipped' }
  }

  /** First slot the given id occupies in the current preview, or null. */
  function slotOfItem(id: number | null): number | null {
    if (id == null)
      return null
    const i = previewIds.value.indexOf(id)
    return i === -1 ? null : i
  }
  function isEquipped(id: number | null): boolean {
    return slotOfItem(id) != null
  }
  /** Remove an item from the build (its first occupied slot). */
  function unequip(item: SearchItem) {
    const slot = slotOfItem(item.id)
    if (slot != null)
      removeSlot(slot)
  }

  function removeSlot(slot: number) {
    const prev = previewIds.value[slot] ?? null
    if (prev == null)
      return
    writeSlot(slot, null)
    pushAction('info', `Removed ${nameForId(prev)}`, { label: 'Undo', run: () => writeSlot(slot, prev) })
  }

  function clear() {
    const prevSlots = draft.slots.slice()
    const prevHash = loadPersistedHash()
    if (prevSlots.every(id => id == null) && !prevHash)
      return
    if (usingBuild.value) {
      for (let i = 0; i < SLOT_LABELS.length; i++) build.setItem(i, null)
    }
    draft.clear()
    persistHash(null)
    pushAction('info', 'Cleared build', {
      label: 'Undo',
      run: () => {
        draft.setSlots(prevSlots)
        if (prevHash)
          persistHash(prevHash)
        if (usingBuild.value)
          prevSlots.forEach((id, slot) => build.setItem(slot, id))
      },
    })
  }

  /** Drop ids that no longer resolve against current data (version drift). */
  function reconcile() {
    // Guard: with no item index loaded yet, every id would look "stale" and the
    // whole draft would be wiped. Do nothing until there's data to validate.
    if (index.value.size === 0)
      return
    draft.reconcile(id => index.value.has(id), gameVersion.value)
  }

  /**
   * Mirror the live build's equipment into the draft. Called on every build
   * change while the panel is open so the draft (and thus the collapsed rail
   * and reload restore) never goes stale relative to the build store.
   */
  function syncDraftFromBuild() {
    if (!build.rawBuild)
      return
    draft.setSlots(build.rawBuild.equipment.slice(0, SLOT_LABELS.length).map(e => slotItemId(e)))
  }

  async function ensurePromoted() {
    // Snapshot the draft up front: loading the saved hash mutates the build,
    // which the live-edit watcher mirrors back into the draft, so reading the
    // draft after the load would lose anything equipped while the panel was
    // closed. The draft is the equipment source of truth.
    const desired = draft.slots.slice()
    if (!build.rawBuild) {
      promoting.value = true
      try {
        // Restore a full in-progress build from a prior session when present;
        // otherwise start fresh. The hash carries the ability tree, skillpoints,
        // powders, tomes and aspects that the slot-only draft can't hold.
        const hash = loadPersistedHash()
        if (hash)
          await build.loadFromHash(hash, useCdnClient())
        else
          await build.newBuild(useCdnClient())
      }
      finally {
        promoting.value = false
      }
    }
    if (build.rawBuild) {
      // Equipment comes from the draft (latest adds win); the restored build
      // supplies the rest (ability tree, skillpoints, powders, etc).
      desired.forEach((id, slot) => build.setItem(slot, id))
      persistHash(build.currentHash)
    }
  }

  /** Desktop: expand the inline full builder. */
  async function openBuilder() {
    open.value = true
    // Show the loading state immediately and let the panel paint + start its
    // slide before promotion runs, so the open feels instant rather than waiting
    // on the (first-time networked) build-context load.
    if (!build.rawBuild)
      promoting.value = true
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === 'undefined')
        resolve()
      else
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    await ensurePromoted()
  }

  /** Snapshot the live build equipment back into the draft, then collapse. */
  function closeBuilder() {
    if (build.rawBuild) {
      syncDraftFromBuild()
      persistHash(build.currentHash)
    }
    open.value = false
  }

  /** Mobile: promote, then route to the dedicated builder page. */
  async function navigateToFullBuilder() {
    promoting.value = true
    try {
      await ensurePromoted()
    }
    finally {
      promoting.value = false
    }
    const hash = build.currentHash
    if (hash)
      await navigateTo(`/builder/${hash}`)
  }

  return {
    open,
    promoting,
    usingBuild,
    previewIds,
    count,
    isEmpty,
    itemFor,
    equip,
    commitToSlot,
    removeSlot,
    slotOfItem,
    isEquipped,
    unequip,
    persistBuildHash: persistHash,
    syncDraftFromBuild,
    hydrateDraft: draft.hydrate,
    clear,
    reconcile,
    openBuilder,
    closeBuilder,
    navigateToFullBuilder,
  }
}
