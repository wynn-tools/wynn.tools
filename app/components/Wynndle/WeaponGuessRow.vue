<script setup lang="ts">
import type { GuessRecord } from '~/lib/wynndle/types'
import GuessCell from './GuessCell.vue'
import IdentityCell from './IdentityCell.vue'

defineProps<{ guess: GuessRecord }>()
</script>

<template>
  <div class="row">
    <IdentityCell :name="guess.item.name" :rarity="guess.item.rarity" />
    <template v-if="guess.feedback">
      <GuessCell
        :status="guess.feedback.class.status"
        :label="(guess.feedback.class.value as string) || '—'"
      />
      <GuessCell
        :status="guess.feedback.level.status"
        :label="guess.feedback.level.value as number"
      />
      <GuessCell
        :status="guess.feedback.dps.status"
        :label="guess.feedback.dps.value as number"
      />
      <GuessCell
        :status="guess.feedback.speed.status"
        :label="(guess.feedback.speed.value as number).toString()"
      />
      <GuessCell
        :status="guess.feedback.rarity.status"
        :label="guess.feedback.rarity.value as string"
        :rarity="guess.feedback.rarity.value as string"
      />
      <GuessCell
        :status="guess.feedback.powders.status"
        :label="guess.feedback.powders.value as number"
      />
      <GuessCell
        :status="guess.feedback.elements.status"
        :elements="guess.feedback.elements.value as string[]"
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
