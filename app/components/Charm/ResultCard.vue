<script setup lang="ts">
import type { SearchCharm } from '~/lib/items-search/types'
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui'

const props = defineProps<{ charm: SearchCharm }>()

const STAT_LABELS: Record<string, string> = {
  damageFromMobs: 'Damage from Mobs',
  leveledLootBonus: 'Leveled Loot Bonus',
  leveledXpBonus: 'Leveled XP Bonus',
}

const baseStats = computed(() =>
  Object.entries(props.charm.base).map(([key, val]) => ({
    label: STAT_LABELS[key] ?? key,
    raw: val.raw,
  })),
)

const idStats = computed(() =>
  Object.entries(props.charm.identifications).map(([key, val]) => ({
    label: STAT_LABELS[key] ?? key,
    min: val.min,
    max: val.max,
  })),
)
</script>

<template>
  <HoverCardRoot :open-delay="0" :close-delay="0">
    <HoverCardTrigger as-child>
      <div class="card">
        <div class="card-title">
          <span class="card-name">{{ charm.displayName }}</span>
          <span class="card-meta">Fabled · Lv. {{ charm.level }}</span>
        </div>
        <dl v-if="baseStats.length" class="card-stats">
          <div v-for="s in baseStats" :key="s.label" class="stat-row">
            <dt class="stat-label">
              {{ s.label }}
            </dt>
            <dd class="stat-val">
              {{ s.raw > 0 ? '+' : '' }}{{ s.raw }}%
            </dd>
          </div>
        </dl>
        <dl v-if="idStats.length" class="card-stats card-stats--ids">
          <div v-for="s in idStats" :key="s.label" class="stat-row">
            <dt class="stat-label">
              {{ s.label }}
            </dt>
            <dd class="stat-val stat-val--range">
              {{ s.min }}–{{ s.max }}%
            </dd>
          </div>
        </dl>
      </div>
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent :side-offset="8" side="right" align="start" class="quickview">
        <div class="quickview-scale">
          <CharmTooltip :charm="charm" />
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
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  transition: border-color 0.1s;
  cursor: default;
}
.card:hover {
  border-color: var(--color-accent);
}
.card-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.card-name {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: #ff5555;
}
.card-meta {
  font-size: 11px;
  color: var(--color-muted);
}
.card-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}
.card-stats--ids {
  border-top-style: dashed;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.stat-label {
  font-size: 12px;
  color: var(--color-muted);
  min-width: 0;
}
.stat-val {
  font: 600 12px/1 var(--font-mono);
  color: var(--color-accent);
  flex-shrink: 0;
}
.stat-val--range {
  color: var(--color-text);
}
</style>
