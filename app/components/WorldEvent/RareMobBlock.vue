<script setup lang="ts">
import type { ResolvedRareMob } from '~/lib/world-events/types'

defineProps<{ mob: ResolvedRareMob }>()
</script>

<template>
  <section class="rare-mob" :aria-label="`Rare mob: ${mob.name}`">
    <header class="rare-mob__head">
      <span class="kicker">Rare mob</span>
      <span v-if="mob.count > 1" class="rare-mob__count">×{{ mob.count }}</span>
    </header>
    <h3 class="rare-mob__name">
      {{ mob.name }}
    </h3>
    <template v-if="mob.drops.length">
      <div class="rare-mob__rule" aria-hidden="true" />
      <div class="chips">
        <ItemChip
          v-for="(d, i) in mob.drops"
          :key="`${d.name}-${i}`"
          :name="d.name"
          :item="d.item"
          :ingredient="d.ingredient"
          :note="d.note ?? null"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.rare-mob {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 18px 20px 20px;
}
.rare-mob + .rare-mob {
  margin-top: 12px;
}

.rare-mob__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  min-height: 14px;
}
.rare-mob__count {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.rare-mob__name {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: var(--color-text);
}

.rare-mob__rule {
  height: 1px;
  background: var(--color-border);
  margin: 14px 0 12px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

@media (max-width: 480px) {
  .rare-mob {
    padding: 14px 16px 16px;
  }
  .rare-mob__name {
    font-size: 16px;
  }
}
</style>
