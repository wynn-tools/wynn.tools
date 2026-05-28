<script setup lang="ts">
import type { SearchIngredient } from '~/lib/items-search/types'
import {
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from 'reka-ui'

const props = defineProps<{ ingredient: SearchIngredient }>()

const TIER_COLOR: Record<number, string> = {
  0: '#cccccc',
  1: '#f6f734',
  2: '#ff44ff',
  3: '#07f2f0',
}
const nameColor = computed(() => TIER_COLOR[props.ingredient.tier] ?? '#fff')
</script>

<template>
  <HoverCardRoot :open-delay="0" :close-delay="0">
    <HoverCardTrigger as-child>
      <div class="card">
        <div class="card-body">
          <span class="card-name" :style="{ color: nameColor }">{{ ingredient.displayName }}</span>
          <span class="card-meta">Tier {{ ingredient.tier }} · Lv. {{ ingredient.level }}</span>
          <span v-if="ingredient.skills.length" class="card-meta card-skills">{{ ingredient.skills.join(', ') }}</span>
        </div>
      </div>
    </HoverCardTrigger>
    <HoverCardPortal>
      <HoverCardContent :side-offset="8" side="right" align="start" class="quickview">
        <div class="quickview-scale">
          <IngredientTooltip :ingredient="ingredient" />
        </div>
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>

<style scoped>
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
.card-skills {
  color: var(--color-faint);
}
.quickview {
  z-index: 60;
}
.quickview-scale {
  zoom: 0.7;
}
</style>
