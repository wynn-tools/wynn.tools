<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { Aspect, AspectTier } from '~/lib/types/aspect'
import type { NormalizedText } from '~/lib/types/atree'
import { computed } from 'vue'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const FONT_FAMILY: Record<string, string> = {
  ascii: '\'wynn-ascii\'',
  common: '\'wynn-common\'',
  default: '\'wynn-default\'',
  five: '\'wynn-five\'',
  wynnic: '\'wynn-wynnic\'',
  high_gavelian: '\'wynn-high-gavelian\'',
  old_fruman: '\'wynn-old-fruman\'',
}

// Rarity tint for the slot accent. Aspect.tier is the rarity name, distinct from
// the numeric upgrade tier the player picks.
const RARITY_COLOR: Record<string, string> = {
  Legendary: 'oklch(78% 0.11 200)',
  Fabled: 'oklch(70% 0.16 18)',
  Mythic: 'oklch(66% 0.18 320)',
  Normal: 'var(--color-muted)',
}

function segmentStyle(seg: NormalizedText): CSSProperties {
  return {
    color: seg.color,
    fontFamily: seg.font ? FONT_FAMILY[seg.font] : undefined,
    fontWeight: seg.bold ? 700 : undefined,
    fontStyle: seg.italic ? 'italic' : undefined,
    textDecoration: seg.underline ? 'underline' : undefined,
  }
}

const aspects = computed<Aspect[]>(() => store.classAspects)
const hasClass = computed(() => aspects.value.length > 0)

const slots = computed(() => store.rawBuild?.aspects.map((_, i) => i) ?? [])

const aspectById = computed(() => new Map(aspects.value.map(a => [a.id, a])))
const idByName = computed(() => new Map(aspects.value.map(a => [a.displayName, a.id])))
const options = computed(() => aspects.value.map(a => a.displayName))

interface SlotView {
  slot: number
  aspect: Aspect | null
  tier: number
  name: string | null
  rarity: string
  color: string
  tierEntry: AspectTier | null
  duplicate: boolean
  mythicExtra: boolean
}

const slotViews = computed<SlotView[]>(() => {
  const seen = new Map<number, number>() // id → first slot index
  let mythicCount = 0
  return slots.value.map((slot) => {
    const cur = store.currentAspect(slot)
    const aspect = cur ? aspectById.value.get(cur[0]) ?? null : null
    const tier = cur ? cur[1] : 0
    let duplicate = false
    let mythicExtra = false
    if (aspect) {
      if (seen.has(aspect.id) && seen.get(aspect.id) !== slot)
        duplicate = true
      else
        seen.set(aspect.id, slot)
      if (aspect.tier === 'Mythic') {
        mythicCount++
        if (mythicCount > 1)
          mythicExtra = true
      }
    }
    return {
      slot,
      aspect,
      tier,
      name: aspect?.displayName ?? null,
      rarity: aspect?.tier ?? 'Normal',
      color: aspect ? RARITY_COLOR[aspect.tier] ?? 'var(--color-muted)' : 'var(--color-muted)',
      tierEntry: aspect && tier > 0 ? aspect.tiers[tier - 1] ?? null : null,
      duplicate,
      mythicExtra,
    }
  })
})

const usedCount = computed(() => slotViews.value.filter(v => v.aspect).length)

function onSelect(slot: number, name: string | null) {
  const id = name != null ? idByName.value.get(name) ?? null : null
  store.setAspect(slot, id)
}

function onTier(slot: number, e: Event) {
  store.setAspectTier(slot, Number.parseInt((e.target as HTMLSelectElement).value, 10))
}

function descSegments(entry: AspectTier | null): NormalizedText[] | string | null {
  return (entry?.description as NormalizedText[] | string | undefined) ?? null
}
</script>

<template>
  <aside class="aspects">
    <header class="head">
      <span class="kicker">Aspects</span>
      <span class="count mono">{{ usedCount }} / {{ slots.length }}</span>
    </header>

    <p v-if="!hasClass" class="empty">
      Equip a weapon to choose aspects.
    </p>

    <ul v-else class="list">
      <li
        v-for="v in slotViews"
        :key="v.slot"
        class="slot"
        :class="{ 'slot--filled': v.aspect, 'slot--invalid': v.duplicate || v.mythicExtra }"
        :style="{ '--rarity': v.color }"
      >
        <div class="slot-row">
          <FilterCombobox
            class="slot-combo"
            :model-value="v.name"
            :options="options"
            placeholder="Empty"
            @update:model-value="onSelect(v.slot, $event)"
          />
          <select
            v-if="v.aspect && v.aspect.tiers.length > 1"
            class="tier-select"
            :value="v.tier"
            :aria-label="`${v.name} tier`"
            @change="onTier(v.slot, $event)"
          >
            <option v-for="n in v.aspect.tiers.length" :key="n" :value="n">
              T{{ n }}
            </option>
          </select>
        </div>

        <p v-if="v.duplicate" class="slot-warn">
          Duplicate aspect — only one copy applies.
        </p>
        <p v-else-if="v.mythicExtra" class="slot-warn">
          Only one Mythic aspect can be active.
        </p>

        <p v-if="v.tierEntry && descSegments(v.tierEntry)" class="slot-desc">
          <template v-if="typeof descSegments(v.tierEntry) === 'string'">
            {{ descSegments(v.tierEntry) }}
          </template>
          <template v-else>
            <span
              v-for="(seg, i) in (descSegments(v.tierEntry) as NormalizedText[])"
              :key="i"
              :style="segmentStyle(seg)"
            >{{ seg.text }}</span>
          </template>
        </p>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.aspects {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.count {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-copper);
}
.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}

.empty {
  margin: 0;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-faint);
  letter-spacing: 0.04em;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: border-color 0.12s;
}
.slot--filled {
  border-color: color-mix(in oklch, var(--rarity) 45%, var(--color-border));
}
.slot--invalid {
  border-color: oklch(62% 0.16 22 / 0.6);
}

.slot-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.slot-combo {
  flex: 1;
  min-width: 0;
}

.tier-select {
  flex-shrink: 0;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--rarity);
  background: color-mix(in oklch, var(--color-bg) 40%, transparent);
  border: 1px solid color-mix(in oklch, var(--rarity) 40%, var(--color-border));
  border-radius: 5px;
  padding: 5px 6px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.12s;
}
.tier-select:focus {
  border-color: var(--rarity);
}

.slot-warn {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: oklch(68% 0.16 22);
}

.slot-desc {
  margin: 0;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.45;
  color: var(--color-muted);
  white-space: pre-line;
}

@media (max-width: 720px) {
  .aspects {
    padding: 12px 14px;
    gap: 10px;
  }
}
</style>
