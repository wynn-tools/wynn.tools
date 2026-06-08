<script setup lang="ts">
import type { GuessRecord } from '~/lib/wynndle/types'
import GuessCell from './GuessCell.vue'
import IdentityCell from './IdentityCell.vue'

// One row of the weapon-mode guess stack. Identity cell + seven attribute
// cells aligned to the legend strip in GameBoard. The element string is
// rendered as the Wynnic-glyph-style symbol per element (these are the
// alchemical-symbol unicode points already in use in the codebase).

defineProps<{ guess: GuessRecord }>()

const ELEMENT_ICON: Record<string, string> = {
  earth: '🜨',
  thunder: '⚡',
  water: '🜄',
  fire: '🜂',
  air: '🜁',
}
</script>

<template>
  <div class="row">
    <IdentityCell :name="guess.item.name" :rarity="guess.item.rarity" />
    <template v-if="guess.feedback">
      <GuessCell
        attribute="Class"
        :status="guess.feedback.class.status"
        :label="(guess.feedback.class.value as string) || '—'"
      />
      <GuessCell
        attribute="Lvl"
        :status="guess.feedback.level.status"
        :label="guess.feedback.level.value as number"
      />
      <GuessCell
        attribute="DPS"
        :status="guess.feedback.dps.status"
        :label="guess.feedback.dps.value as number"
      />
      <GuessCell
        attribute="Speed"
        :status="guess.feedback.speed.status"
        :label="(guess.feedback.speed.value as number).toString()"
      />
      <GuessCell
        attribute="Rarity"
        :status="guess.feedback.rarity.status"
        :label="guess.feedback.rarity.value as string"
      />
      <GuessCell
        attribute="Pwd"
        :status="guess.feedback.powders.status"
        :label="guess.feedback.powders.value as number"
      />
      <GuessCell
        attribute="Elem"
        :status="guess.feedback.elements.status"
        :label="(guess.feedback.elements.value as string[]).map(e => ELEMENT_ICON[e] ?? '?').join('')"
      />
    </template>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: minmax(180px, 1.8fr) repeat(7, minmax(0, 1fr));
  gap: 4px;
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: minmax(140px, 1.6fr) repeat(7, minmax(0, 1fr));
    gap: 2px;
  }
}
</style>
