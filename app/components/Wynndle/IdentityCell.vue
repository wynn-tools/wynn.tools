<script setup lang="ts">
import { TIER_COLORS } from '~/lib/items/tooltip'

// The leftmost cell of every guess row. Item name rendered in its rarity hex
// in the Wynncraft display face, sealed inside a parchment-dark slot pocket
// so it reads as "card pocket containing a game-world item" against the
// envelope's parchment chrome. Sprite is omitted at the data-shape level
// available today (RoundState.guesses[i].item has no icon); when the backend
// surfaces it, drop the sprite back in here.

defineProps<{ name: string, rarity?: string }>()

function rarityColor(rarity?: string) {
  if (!rarity)
    return TIER_COLORS.Normal
  // Normalize: API may return 'unique' or 'Unique'. TIER_COLORS keys use
  // capitalized form per the Wynncraft tooltip palette.
  const key = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase()
  return TIER_COLORS[key] ?? TIER_COLORS.Normal
}
</script>

<template>
  <div class="identity">
    <span class="identity-name" :style="{ color: rarityColor(rarity) }">
      {{ name }}
    </span>
  </div>
</template>

<style scoped>
.identity {
  display: flex;
  align-items: center;
  min-height: 64px;
  padding: 6px 12px;
  background: var(--paper-dark);
  border: 2px solid var(--paper-bd);
  box-shadow:
    inset 0 1px 0 rgb(0 0 0 / 0.18),
    inset 0 -1px 0 var(--paper-bd-light) / 0.4;
}

.identity-name {
  font-family: var(--font-display);
  font-size: 16px;
  line-height: 1.05;
  letter-spacing: -0.01em;
  text-shadow: 1.5px 1.5px 0 rgb(0 0 0 / 0.5);
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .identity {
    min-height: 52px;
    padding: 4px 8px;
  }

  .identity-name {
    font-size: 13px;
  }
}
</style>
