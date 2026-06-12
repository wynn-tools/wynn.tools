<script setup lang="ts">
import type { SearchIngredient, SearchItem } from '~/lib/items-search/types'
import { computed } from 'vue'
import { itemSlug } from '~/lib/items-search/slug'
import { itemIconUrl, spriteUrl } from '~/lib/items/icon'
import { INGREDIENT_TIER_COLORS, rarityColor } from '~/lib/items/rarity'

type DiffState = 'added' | 'removed' | 'changed'

const props = defineProps<{
  /** The display string. Falls back here when no item/ingredient is resolved. */
  name: string
  /** Resolved item (carries rarity, icon, link). Mutually exclusive with ingredient. */
  item?: SearchItem
  /** Resolved ingredient (carries tier, stars, icon). Mutually exclusive with item. */
  ingredient?: SearchIngredient
  /** Optional changelog state. */
  diffState?: DiffState
  /** Freeform annotation surfaced as `title=` (e.g. world-event rare-loot notes). */
  note?: string | null
  /** Force-disable the hover quickview even when resolved data is present. */
  noQuickview?: boolean
}>()

const stars = computed(() => {
  const t = props.ingredient?.tier ?? 0
  return t > 0 ? '★'.repeat(t) : ''
})

const ringColor = computed<string | null>(() => {
  if (props.item)
    return rarityColor(props.item.tier)
  if (props.ingredient)
    return INGREDIENT_TIER_COLORS[props.ingredient.tier] ?? null
  return null
})

const href = computed<string | null>(() =>
  props.item ? `/items/${itemSlug({ name: props.item.name })}` : null,
)

const iconUrl = computed<string | null>(() => {
  if (props.item)
    return itemIconUrl(props.item) ?? spriteUrl(props.item.subType)
  if (props.ingredient)
    return spriteUrl('ingredient')
  return null
})

const displayName = computed(() =>
  props.item?.displayName ?? props.ingredient?.displayName ?? props.name,
)

const hasResolved = computed(() => Boolean(props.item ?? props.ingredient))
const showQuickview = computed(() => !props.noQuickview && hasResolved.value)

const DIFF_GLYPHS: Record<DiffState, string> = { added: '+', removed: '−', changed: '~' }
const diffGlyph = computed(() => (props.diffState ? DIFF_GLYPHS[props.diffState] : null))

const ringStyle = computed(() => {
  const c = ringColor.value
  if (!c)
    return null
  return {
    '--chip-ring': c,
  }
})

const ariaLabel = computed(() => {
  const parts: string[] = []
  if (props.diffState)
    parts.push(props.diffState)
  parts.push(displayName.value)
  if (props.item?.tier && props.item.tier !== 'Normal')
    parts.push(props.item.tier)
  if (props.ingredient?.tier)
    parts.push(`tier ${props.ingredient.tier}`)
  return parts.join(' ')
})
</script>

<template>
  <Quickview :disabled="!showQuickview">
    <template #trigger>
      <component
        :is="href ? 'NuxtLink' : 'span'"
        :to="href"
        class="chip"
        :class="[
          ringColor ? 'chip--rarity' : null,
          diffState ? `chip--${diffState}` : null,
          !ringColor && !diffState ? 'chip--plain' : null,
        ]"
        :style="ringStyle"
        :title="note ?? undefined"
        :aria-label="ariaLabel"
      >
        <span v-if="diffGlyph" class="chip__diff" aria-hidden="true">{{ diffGlyph }}</span>
        <img
          v-if="iconUrl"
          :src="iconUrl"
          class="chip__icon"
          alt=""
          loading="lazy"
          decoding="async"
        >
        <span v-if="stars" class="chip__stars" aria-hidden="true">{{ stars }}</span>
        <span class="chip__name">{{ displayName }}</span>
      </component>
    </template>
    <IngredientTooltip v-if="ingredient" :ingredient="ingredient" />
    <ItemTooltip v-else-if="item" :item="item" :exportable="false" />
  </Quickview>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px 2px 8px;
  min-height: 22px;
  border: 1px solid var(--chip-ring, var(--color-border));
  border-radius: 9999px;
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  white-space: nowrap;
  transition:
    border-color 0.12s ease-out,
    background 0.12s ease-out,
    color 0.12s ease-out;
}
.chip--rarity {
  background: color-mix(in srgb, var(--chip-ring) 6%, var(--color-surface));
}
.chip--plain {
  color: var(--color-muted);
}
a.chip:hover,
a.chip:focus-visible {
  background: color-mix(in srgb, var(--chip-ring, var(--color-accent)) 14%, var(--color-surface));
}
a.chip:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.chip__icon {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.chip__stars {
  font-size: 10px;
  line-height: 1;
  letter-spacing: -1px;
  color: var(--chip-ring, var(--color-accent));
  flex-shrink: 0;
}
.chip__diff {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1;
  font-weight: 600;
  width: 8px;
  text-align: center;
  flex-shrink: 0;
}
.chip__name {
  min-width: 0;
}

/* ── Diff state composition ──────────────────────────────────────── */
.chip--added .chip__diff {
  color: var(--color-accent);
}
.chip--removed {
  opacity: 0.65;
}
.chip--removed .chip__diff {
  color: var(--color-muted);
}
.chip--removed .chip__name {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  text-decoration-color: color-mix(in oklch, var(--color-muted) 60%, transparent);
}
.chip--changed .chip__diff {
  color: var(--color-faint);
}
</style>
