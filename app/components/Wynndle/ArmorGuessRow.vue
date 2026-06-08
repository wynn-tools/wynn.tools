<script setup lang="ts">
import type { GuessRecord } from '~/lib/wynndle/types'
import GuessCell from './GuessCell.vue'
import IdentityCell from './IdentityCell.vue'

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
        attribute="Type"
        :status="guess.feedback.type.status"
        :label="(guess.feedback.type.value as string) || '—'"
      />
      <GuessCell
        attribute="Lvl"
        :status="guess.feedback.level.status"
        :label="guess.feedback.level.value as number"
      />
      <GuessCell
        attribute="HP"
        :status="guess.feedback.health.status"
        :label="guess.feedback.health.value as number"
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
      <GuessCell
        attribute="SkRq"
        :status="guess.feedback.skillReqs.status"
        :label="(guess.feedback.skillReqs.value as string[]).map(s => s[0]!.toUpperCase()).join('') || '—'"
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
