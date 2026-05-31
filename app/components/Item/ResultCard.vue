<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui'
import { useBuilderRail } from '~/composables/useBuilderRail'
import { SLOT_LABELS } from '~/lib/builder-draft/routing'
import { humanizeField } from '~/lib/data/identifications'
import { itemSlug } from '~/lib/items-search/slug'
import { itemIconUrl } from '~/lib/items/icon'

const props = defineProps<{ item: SearchItem, idKeys?: string[] }>()

const rail = useBuilderRail()
const equippedSlot = computed(() => rail.slotOfItem(props.item.id))
const equipped = computed(() => equippedSlot.value != null)
const equippedLabel = computed(() => equippedSlot.value != null ? SLOT_LABELS[equippedSlot.value] : '')
const TIER_COLORS: Record<string, string> = {
  Normal: '#ffffff',
  Set: '#55ff55',
  Unique: '#ffff55',
  Rare: '#ff55ff',
  Legendary: '#55ffff',
  Fabled: '#ff5555',
  Mythic: '#aa00aa',
  Crafted: '#00aaaa',
}
const icon = computed(() => itemIconUrl(props.item))
const cols = computed(() => (props.idKeys ?? []).map(k => ({
  label: humanizeField(k).label,
  raw: props.item.identifications[k]?.raw,
})))
</script>

<template>
  <HoverCardRoot :open-delay="0" :close-delay="0">
    <HoverCardTrigger as-child>
      <div class="card-wrap" :class="{ 'is-equipped': equipped }">
        <NuxtLink :to="{ path: `/items/${itemSlug(item)}`, query: { name: item.displayName } }" class="card" :class="{ 'card--equipped': equipped }">
          <img v-if="icon" :src="icon" class="card-icon" alt="" aria-hidden="true">
          <span v-else class="card-icon card-icon--empty" aria-hidden="true" />
          <div class="card-body">
            <span class="card-name" :style="{ color: TIER_COLORS[item.tier] ?? '#fff' }">{{ item.displayName }}</span>
            <span class="card-meta">Lv. {{ item.level }} · {{ item.subType }}</span>
            <ul v-if="cols.length" class="card-ids">
              <li v-for="c in cols" :key="c.label">
                <span class="card-id-val">{{ c.raw ?? '—' }}</span> {{ c.label }}
              </li>
            </ul>
          </div>
        </NuxtLink>
        <span v-if="equipped" class="card-tag">
          <span class="card-tag-check" aria-hidden="true">✓</span>{{ equippedLabel }}
        </span>
        <div class="card-equip">
          <BuilderEquipButton :item="item" />
        </div>
      </div>
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent :side-offset="8" side="right" align="start" class="quickview">
        <div class="quickview-scale">
          <ItemTooltip :item="item" />
        </div>
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>

<style scoped>
.card-wrap {
  position: relative;
}
.card-equip {
  position: absolute;
  top: 7px;
  right: 7px;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity 0.12s ease-out,
    transform 0.12s ease-out;
}
/* Reveal on hover or while the button (or its ring popover) holds focus. */
.card-wrap:hover .card-equip,
.card-wrap:focus-within .card-equip {
  opacity: 1;
  transform: none;
}
/* Touch devices have no hover: keep the affordance always visible. */
@media (hover: none) {
  .card-equip {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .card-equip {
    transition: none;
  }
}
.card {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  text-decoration: none;
  transition:
    border-color 0.1s,
    background 0.1s;
}
.card:hover {
  border-color: var(--color-accent);
}
/* Equipped: persistent selected state — accent border + faint accent ground. */
.card--equipped {
  border-color: color-mix(in oklch, var(--color-accent) 70%, var(--color-border));
  background: color-mix(in oklch, var(--color-accent) 7%, var(--color-surface));
}
/* Reserve the corner so a long name truncates before the tag / Unequip button. */
.is-equipped .card-body {
  padding-right: 58px;
}

.card-tag {
  position: absolute;
  top: 7px;
  right: 7px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  font: 500 9px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 12%, var(--color-surface));
  border-radius: 4px;
  transition: opacity 0.12s ease-out;
}
.card-tag-check {
  font-size: 10px;
}
/* On hover the corner swaps the tag out for the Unequip button. */
.card-wrap:hover .card-tag,
.card-wrap:focus-within .card-tag {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .card-tag {
    transition: none;
  }
}
.card-icon {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.card-icon--empty {
  visibility: hidden;
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.card-name {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
}
.card-meta {
  font-size: 11px;
  color: var(--color-muted);
  text-transform: capitalize;
}
.card-ids {
  list-style: none;
  font-size: 11px;
  color: var(--color-faint);
  margin-top: 4px;
}
.card-id-val {
  color: var(--color-accent);
}
.quickview {
  z-index: 60;
}
.quickview-scale {
  zoom: 0.7;
}
</style>
