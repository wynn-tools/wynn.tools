<script setup lang="ts">
import type { SearchTome } from '~/lib/items-search/types'
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui'
import { itemIconUrl } from '~/lib/items/icon'

const props = defineProps<{ tome: SearchTome }>()

const TIER_COLORS: Record<string, string> = {
  common: '#ffffff',
  unique: '#ffff55',
  rare: '#ff55ff',
  legendary: '#55ffff',
  fabled: '#ff5555',
  mythic: '#aa00aa',
}

const TOME_TYPE_LABELS: Record<string, string> = {
  weapon_tome: 'Weapon',
  armour_tome: 'Armour',
  guild_tome: 'Guild',
  lootrun_tome: 'Lootrun',
  mysticism_tome: 'Mysticism',
  marathon_tome: 'Marathon',
  expertise_tome: 'Expertise',
}

const SOURCE_LABELS: Record<string, string> = {
  raid: 'Raid',
  guild: 'Guild',
  lootrun: 'Lootrun',
}

const SENTINEL = 99999

const nameColor = computed(() => TIER_COLORS[props.tome.tier.toLowerCase()] ?? '#ffffff')
const icon = computed(() => itemIconUrl({ icon: props.tome.icon }))
const typeLabel = computed(() => TOME_TYPE_LABELS[props.tome.type] ?? props.tome.type)

const source = computed(() => {
  const dm = props.tome.dropMeta
  if (!dm)
    return null
  const coords = dm.coordinates
  if (coords[0] === SENTINEL)
    return null
  return SOURCE_LABELS[dm.type] ?? dm.type
})
</script>

<template>
  <HoverCardRoot :open-delay="0" :close-delay="0">
    <HoverCardTrigger as-child>
      <div class="card">
        <img v-if="icon" :src="icon" class="card-icon" alt="" aria-hidden="true">
        <span v-else class="card-icon card-icon--empty" aria-hidden="true" />
        <div class="card-body">
          <span class="card-name" :style="{ color: nameColor }">{{ tome.displayName }}</span>
          <span class="card-meta">{{ typeLabel }} · Lv. {{ tome.level }}</span>
          <span v-if="source" class="card-source" :class="`card-source--${tome.dropMeta?.type}`">{{ source }}</span>
          <span v-else class="card-source card-source--none">No source</span>
        </div>
      </div>
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent :side-offset="8" side="right" align="start" class="quickview">
        <div class="quickview-scale">
          <TomeTooltip :tome="tome" />
        </div>
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>

<style scoped>
.quickview {
  z-index: 60;
}
.quickview-scale {
  zoom: 0.7;
}
.card {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  transition: border-color 0.1s;
  cursor: default;
}
.card:hover {
  border-color: var(--color-accent);
}
.card-icon {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.card-icon--empty {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
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
.card-source {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 2px;
  width: fit-content;
  padding: 2px 6px;
  border-radius: 3px;
}
.card-source--raid {
  color: oklch(65% 0.15 48);
  background: oklch(65% 0.15 48 / 0.1);
}
.card-source--guild {
  color: oklch(72% 0.12 150);
  background: oklch(72% 0.12 150 / 0.1);
}
.card-source--lootrun {
  color: oklch(70% 0.13 260);
  background: oklch(70% 0.13 260 / 0.1);
}
.card-source--none {
  color: var(--color-faint);
  background: transparent;
  padding-left: 0;
}
</style>
