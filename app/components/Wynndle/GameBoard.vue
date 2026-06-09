<script setup lang="ts">
import type { PuzzleMeta, RoundState, WynndleMode } from '~/lib/wynndle/types'
import { puzzleNumberFor } from '~/lib/wynndle/anchor'
import ArmorGuessRow from './ArmorGuessRow.vue'
import HintPanel from './HintPanel.vue'
import ItemCombobox from './ItemCombobox.vue'
import WeaponGuessRow from './WeaponGuessRow.vue'
import WinScreen from './WinScreen.vue'

const props = defineProps<{
  puzzle: PuzzleMeta
  round: RoundState | null
  mode: WynndleMode
  busy: boolean
}>()
const emit = defineEmits<{ submit: [id: string], hint: [] }>()

const guesses = computed(() => props.round?.guesses ?? [])
const finished = computed(() => props.round?.finished ?? false)

const puzzleNumber = computed(() => puzzleNumberFor(props.puzzle.date))

const exclude = computed(() => guesses.value.map(g => g.item.id))

const guessCount = computed(() => guesses.value.length)
const guessesLeft = computed(() => Math.max(0, 10 - guessCount.value))

// Sub-mode tabs at the top of the board route to the sister mode for quick
// switching between Weapon and Armor. They live here rather than in the
// envelope nav because the brief (Q6) keeps the top pill rail at the game
// level — sub-mode lives inside Wynndle.
const modeTabs = [
  { href: '/play/wynndle/weapon', label: 'Weapon' },
  { href: '/play/wynndle/armor', label: 'Armor' },
]

const route = useRoute()
function isModeActive(href: string) {
  return route.path === href
}

// The attribute legend strip mirrors each row's 7 attribute columns, teaching
// the row grammar at a glance. Two different layouts for the two modes.
const weaponAttrs = ['CLASS', 'LVL', 'DPS', 'SPEED', 'RARITY', 'PWD', 'ELEM']
const armorAttrs = ['TYPE', 'LVL', 'HP', 'RARITY', 'PWD', 'ELEM', 'SKRQ']
const attrs = computed(() => props.mode === 'weapon' ? weaponAttrs : armorAttrs)
</script>

<template>
  <section class="board" :class="{ 'is-finished': finished }">
    <div class="board-frame">
      <!-- Challenge header band: WYNNDLE · WEAPON · DAY 184 · YYYY-MM-DD left,
           durability-style guess counter right. -->
      <header class="challenge">
        <div class="challenge-line">
          <span class="challenge-tag">WYNNDLE</span>
          <span class="challenge-sep">·</span>
          <span class="challenge-mode">{{ mode.toUpperCase() }}</span>
          <span class="challenge-sep">·</span>
          <span class="challenge-day">DAY {{ puzzleNumber }}</span>
          <span class="challenge-sep">·</span>
          <time class="challenge-date">{{ puzzle.date }}</time>
        </div>
        <div class="counter" :data-low="guessesLeft <= 2">
          <span class="counter-val">{{ guessCount }}</span>
          <span class="counter-slash">/</span>
          <span class="counter-max">10</span>
        </div>
      </header>

      <!-- Inline mode tabs (in-page Weapon ¦ Armor switcher per Q6). -->
      <div class="mode-tabs" role="tablist" aria-label="Wynndle mode">
        <NuxtLink
          v-for="t in modeTabs"
          :key="t.href"
          :to="t.href"
          class="mode-tab"
          :class="{ 'is-active': isModeActive(t.href) }"
          role="tab"
        >
          {{ t.label }}
        </NuxtLink>
      </div>

      <!-- Attribute legend strip: same 8-column grid as the rows so the
           labels sit directly above their cells. -->
      <div class="legend" aria-hidden="true">
        <div class="legend-identity">
          ITEM
        </div>
        <div v-for="a in attrs" :key="a" class="legend-cell">
          {{ a }}
        </div>
      </div>

      <!-- Guess stack. Newest at top: the existing useWynndle composable
           returns guesses in submit order, so we reverse for display. -->
      <ul class="guesses">
        <li v-for="g in [...guesses].reverse()" :key="g.ordinal">
          <WeaponGuessRow v-if="mode === 'weapon'" :guess="g" />
          <ArmorGuessRow v-else :guess="g" />
        </li>
        <li v-if="!guesses.length" class="guesses-empty">
          Type below to start your first guess.
        </li>
      </ul>

      <div v-if="!finished" class="combobox-mount">
        <ItemCombobox
          :mode="mode"
          :game-version="puzzle.gameVersion"
          :disabled="busy"
          :exclude="exclude"
          @submit="(id: string) => emit('submit', id)"
        />
      </div>
    </div>

    <!-- Hint aside is mid-game only. When the round finishes the WinScreen
         mounts as row 2 spanning both grid columns; leaving a sticky aside
         in row 1's right column would visually float it over the reveal
         panel because sticky is constrained to the grid container, not the
         row. Dropping the aside entirely lets the reveal own the space. -->
    <aside v-if="!finished" class="aside">
      <HintPanel
        v-if="round"
        :hints="round.hints"
        :guess-count="round.guesses.length"
        :finished="finished"
        @reveal="emit('hint')"
      />
    </aside>

    <WinScreen v-if="finished && round" :round="round" :mode="mode" :puzzle-number="puzzleNumber" />
  </section>
</template>

<style scoped>
/* Two-column layout on desktop: main board + hint aside in the right margin.
   Mobile collapses to a single column with hints below the input. The board
   frame itself uses the medium wood-frame heft tier per Q17. */
.board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 32px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 0 64px;
  align-items: start;
}

/* When the round is finished and the hint aside is dropped, collapse to a
   single column so the win/loss reveal panel uses the full board width
   instead of leaving an empty 240px gutter on the right. */
.board.is-finished {
  grid-template-columns: minmax(0, 1fr);
}

.board-frame {
  background: var(--paper-base);
  padding: 28px 28px 22px;
  box-shadow: var(--wood-shadow-medium);
  display: grid;
  gap: 16px;
}

/* Challenge header */
.challenge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.challenge-line {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--paper-text);
}

.challenge-tag {
  color: var(--paper-text-strong);
  font-weight: 600;
}

.challenge-sep {
  opacity: 0.45;
}

.challenge-mode,
.challenge-day {
  color: var(--paper-text-strong);
}

.challenge-date {
  font-variant-numeric: tabular-nums;
}

/* Durability-style counter: large guess count, slash, capacity. Color shifts
   to danger when 2 or fewer guesses remain. */
.counter {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--paper-text-strong);
  padding: 4px 12px;
  background: var(--paper-dark);
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
}

.counter[data-low='true'] {
  color: var(--element-danger);
}

.counter-slash {
  opacity: 0.4;
  margin: 0 2px;
}

.counter-max {
  opacity: 0.7;
  font-size: 14px;
}

/* Inline mode tabs — parchment pills with gold-edged active variant,
   matches the envelope nav pill language but at a smaller scale. */
.mode-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: rgb(65 38 36 / 0.18);
  border: 2px solid var(--paper-bd);
  align-self: start;
}

.mode-tab {
  padding: 6px 16px;
  background: var(--paper-base);
  color: var(--paper-text);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  border: 2px solid var(--paper-bd);
  transition:
    background-color 0.12s ease-out,
    color 0.12s ease-out;
}

.mode-tab:hover {
  background: var(--paper-light);
}

.mode-tab.is-active {
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border-color: rgb(82 60 18);
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
}

.mode-tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Attribute legend strip: same grid as the rows so labels stack above
   their cells. Slot styling reduced (no fill, just border + thin label). */
.legend {
  display: grid;
  grid-template-columns: minmax(180px, 1.8fr) repeat(7, minmax(0, 1fr));
  gap: 4px;
  margin-top: 4px;
}

.legend-identity,
.legend-cell {
  text-align: center;
  padding: 6px 4px;
  background: rgb(65 38 36 / 0.18);
  border: 2px solid var(--paper-bd);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--paper-text-strong);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
}

.legend-identity {
  text-align: left;
  padding-left: 12px;
}

.guesses {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 4px;
}

.guesses-empty {
  padding: 28px 16px;
  text-align: center;
  font-family: var(--font-body);
  color: var(--paper-text);
  font-size: 14px;
  background: rgb(65 38 36 / 0.06);
  border: 2px dashed var(--paper-bd);
}

.aside {
  position: sticky;
  top: 130px;
}

@media (max-width: 960px) {
  .board {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }

  .aside {
    position: static;
  }
}

@media (max-width: 640px) {
  .board {
    padding: 12px 0 24px;
  }

  .board-frame {
    padding: 18px 12px 14px;
    gap: 10px;
  }

  /* Challenge header tightens: line wraps to two rows naturally on 360px,
     counter stays right-aligned via the existing flex. */
  .challenge {
    gap: 10px;
    align-items: flex-start;
  }

  .challenge-line {
    font-size: 10px;
    letter-spacing: 0.06em;
    gap: 5px;
    line-height: 1.4;
  }

  .counter {
    font-size: 15px;
    padding: 3px 10px;
    flex-shrink: 0;
  }

  /* Legend mirrors the row's stacked shape: identity word as a full-width
     band, then the 7 attribute headers in their own grid below. */
  .legend {
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 3px;
  }

  .legend-identity {
    grid-column: 1 / -1;
    text-align: left;
    padding: 5px 12px;
    font-size: 9px;
  }

  .legend-cell {
    padding: 4px 2px;
    font-size: 8px;
    letter-spacing: 0.06em;
  }

  /* Sticky guess input: lifts to the viewport so the player can keep
     submitting while scrolling through guesses. Sits above the play
     envelope's bottom hotbar (96px reserve + safe-area inset). */
  .combobox-mount {
    position: sticky;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 100px);
    z-index: 4;
    margin-top: 4px;
  }

  .guesses {
    gap: 3px;
  }

  .mode-tabs {
    align-self: stretch;
  }

  .mode-tab {
    flex: 1;
    text-align: center;
    padding: 8px 12px;
    font-size: 12px;
  }
}

@media (max-width: 400px) {
  .legend-cell {
    font-size: 7px;
    letter-spacing: 0.04em;
  }

  .challenge-line {
    font-size: 9px;
  }
}
</style>
