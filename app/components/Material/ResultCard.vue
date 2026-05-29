<script setup lang="ts">
import type { SearchMaterial } from '~/lib/items-search/types'
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui'

const props = defineProps<{ material: SearchMaterial }>()

const SUBTYPE_COLORS: Record<string, string> = {
  mining: 'oklch(62% 0.10 60)',
  farming: 'oklch(65% 0.12 145)',
  fishing: 'oklch(62% 0.12 220)',
  woodcutting: 'oklch(60% 0.10 40)',
}

const subtypeColor = computed(() => SUBTYPE_COLORS[props.material.subType] ?? 'var(--color-muted)')

const totalChance = computed(() => {
  const { tier1, tier2, tier3 } = props.material.chances
  return tier1 + tier2 + tier3
})
</script>

<template>
  <HoverCardRoot :open-delay="0" :close-delay="0">
    <HoverCardTrigger as-child>
      <div class="card">
        <div class="card-body">
          <span class="card-name">{{ material.displayName }}</span>
          <span class="card-meta">
            <span class="subtype-chip" :style="{ color: subtypeColor }">{{ material.subType }}</span>
            · Lv. {{ material.level }}
          </span>
          <div v-if="totalChance > 0" class="card-chances">
            <span v-if="material.chances.tier1" class="chance chance--t1">T1 {{ material.chances.tier1 }}%</span>
            <span v-if="material.chances.tier2" class="chance chance--t2">T2 {{ material.chances.tier2 }}%</span>
            <span v-if="material.chances.tier3" class="chance chance--t3">T3 {{ material.chances.tier3 }}%</span>
          </div>
        </div>
      </div>
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent :side-offset="8" side="right" align="start" class="quickview">
        <div class="quickview-scale">
          <MaterialTooltip :material="material" />
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
.card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.card-name {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}
.card-meta {
  font-size: 11px;
  color: var(--color-muted);
}
.subtype-chip {
  text-transform: capitalize;
  font-weight: 500;
}
.card-chances {
  display: flex;
  gap: 6px;
  margin-top: 2px;
  flex-wrap: wrap;
}
.chance {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.04em;
  padding: 2px 5px;
  border-radius: 3px;
}
.chance--t1 {
  color: oklch(72% 0.08 60);
  background: oklch(72% 0.08 60 / 0.1);
}
.chance--t2 {
  color: oklch(65% 0.12 48);
  background: oklch(65% 0.12 48 / 0.12);
}
.chance--t3 {
  color: oklch(72% 0.14 75);
  background: oklch(72% 0.14 75 / 0.12);
}
</style>
