<script setup lang="ts">
import type { Hint } from '~/lib/wynndle/types'
import { LockKeyhole } from '@lucide/vue'

// Four parchment hint cards in a vertical stack. Threshold-gated unlock per
// the existing backend gates [0, 2, 4, 6, 8] (the brief assumed three hints
// at 3/5/7; the existing system has four at 2/4/6/8 — we respect the live
// data). Locked = paper-dark + lock icon + "Unlocks at guess N". Unlockable
// = paper-base + green inner border + "Click to open". Opened = hint content
// in place + "OPENED · GUESS N" corner stamp.

const props = defineProps<{ hints: Hint[], guessCount: number, finished: boolean }>()
const emit = defineEmits<{ reveal: [] }>()

const HINT_GATES = [0, 2, 4, 6, 8]
const KIND_LABEL: Record<Hint['kind'], string> = {
  type: 'Type',
  levelRange: 'Level Range',
  rarity: 'Rarity',
  letter: 'First Letter',
}
const KIND_ORDER: Hint['kind'][] = ['type', 'levelRange', 'rarity', 'letter']

// Card state model: for each of the 4 hint slots, decide what state to
// render. Already-revealed hints occupy the leading slots. The next
// unrevealed slot becomes 'unlockable' once guessCount >= its gate; the
// rest remain 'locked'.
interface SlotState {
  index: number
  kind: Hint['kind']
  state: 'opened' | 'unlockable' | 'locked'
  value?: string
  unlockedAt?: number
  unlocksAt: number
}

const slots = computed<SlotState[]>(() => {
  const out: SlotState[] = []
  for (let i = 0; i < 4; i++) {
    const kind = KIND_ORDER[i]!
    const unlocksAt = HINT_GATES[i + 1]!
    const revealed = props.hints[i]
    if (revealed) {
      out.push({
        index: i,
        kind,
        state: 'opened',
        value: revealed.value,
        unlocksAt,
      })
      continue
    }
    // Unrevealed: unlockable if it's the *next* slot AND its gate is met,
    // otherwise locked. Only the first unrevealed slot is ever unlockable —
    // the player has to open them in order.
    const isNext = i === props.hints.length
    const canUnlock = isNext && !props.finished && props.guessCount >= unlocksAt
    out.push({
      index: i,
      kind,
      state: canUnlock ? 'unlockable' : 'locked',
      unlocksAt,
    })
  }
  return out
})

function openCard(s: SlotState) {
  if (s.state === 'unlockable')
    emit('reveal')
}
</script>

<template>
  <section class="hints" aria-label="Hints">
    <h3 class="hints-kicker">
      HINTS
    </h3>
    <ol class="hint-list">
      <li
        v-for="s in slots"
        :key="s.index"
        class="hint-card"
        :data-state="s.state"
        :tabindex="s.state === 'unlockable' ? 0 : -1"
        :role="s.state === 'unlockable' ? 'button' : undefined"
        :aria-disabled="s.state !== 'unlockable'"
        @click="openCard(s)"
        @keydown.enter.space.prevent="openCard(s)"
      >
        <div class="hint-head">
          <LockKeyhole v-if="s.state === 'locked'" :size="12" :stroke-width="2" />
          <span class="hint-label">{{ KIND_LABEL[s.kind] }}</span>
          <span v-if="s.state === 'opened'" class="hint-stamp">OPENED</span>
        </div>
        <div class="hint-body">
          <template v-if="s.state === 'opened'">
            {{ s.value }}
          </template>
          <template v-else-if="s.state === 'unlockable'">
            Click to open
          </template>
          <template v-else>
            Unlocks at guess {{ s.unlocksAt }}
          </template>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.hints {
  display: grid;
  gap: 10px;
}

.hints-kicker {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--paper-base);
  margin: 0;
  padding: 4px 14px;
  background: rgb(65 38 36 / 0.55);
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
  align-self: start;
  display: inline-block;
}

.hint-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

/* Hint card anatomy. Background tint signals state per Q10:
   locked → paper-dark, unlockable → paper-base + primary inset border,
   opened → paper-light (slightly brighter parchment to mark "this is read"). */
.hint-card {
  position: relative;
  padding: 10px 12px;
  background: var(--paper-base);
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
  display: grid;
  gap: 4px;
  cursor: default;
  transition:
    background-color 0.2s ease-out,
    box-shadow 0.2s ease-out;
}

.hint-card[data-state='locked'] {
  background: var(--paper-dark);
  opacity: 0.78;
}

.hint-card[data-state='unlockable'] {
  background: var(--paper-base);
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 var(--paper-bd-light),
    inset 0 0 0 2px var(--primary);
}

.hint-card[data-state='unlockable']:hover {
  background: var(--paper-light);
}

.hint-card[data-state='unlockable']:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

.hint-card[data-state='opened'] {
  background: var(--paper-light);
}

.hint-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--paper-text-strong);
}

.hint-stamp {
  margin-left: auto;
  font-size: 9px;
  letter-spacing: 0.14em;
  color: var(--paper-text);
  opacity: 0.65;
}

.hint-body {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.4;
  color: var(--paper-text);
}

.hint-card[data-state='opened'] .hint-body {
  color: var(--paper-text-strong);
  font-weight: 500;
}

.hint-card[data-state='unlockable'] .hint-body {
  color: var(--paper-text-strong);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

@media (max-width: 960px) {
  .hint-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .hint-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
