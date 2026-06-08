<script setup lang="ts">
// Daily-only leaderboard per Q15. Rank in the left rail (gold/silver/bronze
// on top 3 via full row treatment, not medal icons), Discord display name
// center, attempts + time + hint annotation right. The brief also calls for
// a pinned "YOU" row at the top of the list; that lives in the leaderboard
// page itself because it needs the auth state, not in this list component.

defineProps<{
  rows: { rank: number, username: string, guesses: number, hints: number, durationMs: number | null }[]
}>()

function fmt(ms: number | null) {
  if (ms == null)
    return '—'
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="lb-list" role="list">
    <article
      v-for="r in rows"
      :key="r.rank"
      class="lb-row"
      :data-rank="r.rank <= 3 ? r.rank : null"
      role="listitem"
    >
      <span class="lb-rank">{{ r.rank }}</span>
      <span class="lb-user">{{ r.username }}</span>
      <span class="lb-stats">
        <span class="lb-score">{{ r.guesses }} / 10</span>
        <span class="lb-time">{{ fmt(r.durationMs) }}</span>
        <span v-if="r.hints > 0" class="lb-hints">+{{ r.hints }} hint{{ r.hints === 1 ? '' : 's' }}</span>
      </span>
    </article>
    <p v-if="!rows.length" class="lb-empty">
      No entries yet. Be first on the board.
    </p>
  </div>
</template>

<style scoped>
.lb-list {
  display: grid;
  gap: 4px;
}

/* One row = one parchment panel with light wood-frame border. Rank 1, 2, 3
   carry medal treatments: gold, silver, bronze respectively. The treatment
   is the whole row background, no separate medal icon. */
.lb-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  padding: 12px 18px;
  background: var(--paper-base);
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
}

.lb-row[data-rank='1'] {
  background: var(--ingot-gold-dim);
  border-color: rgb(82 60 18);
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -1px 0 rgb(120 86 14);
  color: rgb(40 26 8);
}

.lb-row[data-rank='2'] {
  background: rgb(188 188 188);
  border-color: rgb(96 96 96);
  box-shadow:
    inset 0 1px 0 rgb(232 232 232),
    inset 0 -1px 0 rgb(72 72 72);
  color: rgb(28 28 28);
}

.lb-row[data-rank='3'] {
  background: rgb(168 110 60);
  border-color: rgb(78 44 22);
  box-shadow:
    inset 0 1px 0 rgb(220 152 88),
    inset 0 -1px 0 rgb(58 30 14);
  color: rgb(38 18 8);
}

.lb-rank {
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 1;
  text-align: center;
  color: inherit;
  text-shadow: 1.5px 1.5px 0 rgb(0 0 0 / 0.3);
}

.lb-user {
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.02em;
  color: inherit;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lb-stats {
  display: inline-flex;
  align-items: baseline;
  gap: 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: inherit;
  white-space: nowrap;
}

.lb-score {
  font-size: 14px;
  font-weight: 600;
}

.lb-time {
  opacity: 0.78;
  font-variant-numeric: tabular-nums;
}

.lb-hints {
  opacity: 0.62;
  font-size: 11px;
}

.lb-empty {
  padding: 36px 16px;
  text-align: center;
  font-family: var(--font-body);
  color: var(--paper-text);
  background: rgb(65 38 36 / 0.06);
  border: 2px dashed var(--paper-bd);
  margin: 0;
}

@media (max-width: 720px) {
  .lb-row {
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 12px;
    padding: 10px 14px;
  }

  .lb-stats {
    grid-column: 2;
    gap: 8px;
    font-size: 11px;
  }

  .lb-rank {
    font-size: 18px;
  }
}
</style>
