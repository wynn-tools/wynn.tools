<script setup lang="ts">
import type { RoundState, WynndleMode } from '~/lib/wynndle/types'
import { ArrowLeft, ArrowRight } from '@lucide/vue'
import { TIER_COLORS } from '~/lib/items/tooltip'
import ShareGrid from './ShareGrid.vue'

// In-place reveal panel. Mounts below the guess stack when the round
// finishes; replaces the input footer in the same vertical slot.
// Header: SOLVED (green) or BESTED (red) in wynncraft display. Subhead
// summarizes attempts. Answer item rendered with rarity color + ledger
// metadata (full walled-garden tooltip wiring lands when the tooltip
// component is plumbed in Pass 5 critique).

const props = defineProps<{ round: RoundState, mode: WynndleMode, puzzleNumber: number }>()

// Template ref on the reveal section so we can scroll it into the viewport
// after mount. On long games (10 rows × ~80px) the reveal lands well below
// the fold; without the auto-scroll the delight cascade plays where the
// player can't see it.
const revealRef = ref<HTMLElement | null>(null)

const guessCount = computed(() => props.round.guesses.length)
const hintsUsed = computed(() => props.round.hintsRevealed ?? 0)

const answerRarity = computed(() => props.round.answer?.rarity ?? 'Normal')

// Earned-rank header word: graded vocabulary based on attempt count so the
// player gets recognition for *how* they solved, not just that they did. A
// loss keeps the single BESTED word; the empathy subhead below carries the
// variation instead.
const headerWord = computed(() => {
  if (!props.round.won)
    return 'BESTED'
  const n = guessCount.value
  if (n <= 1)
    return 'ORACLE'
  if (n === 2)
    return 'DEDUCED'
  if (n === 3)
    return 'DECISIVE'
  if (n <= 5)
    return 'SOLVED'
  if (n <= 7)
    return 'SCRAPED'
  if (n <= 9)
    return 'NEAR THING'
  return 'CLUTCH'
})

// In-world empathy lines for losses. Selected by a deterministic hash of
// puzzle + mode so the same player reading the same loss screen sees a
// stable line, but the line rotates day-to-day. No randomization-on-mount
// (would flicker on remount); no em dashes (DESIGN.md ban).
const LOSS_LINES = [
  'The questbook turns a new page at midnight.',
  'Even the lorekeepers fail sometimes.',
  'The Province of Wynn keeps its secrets.',
  'Tomorrow, another item drops.',
  'Some weapons stay sheathed.',
  'Olux remembers. Olux is not telling.',
  'No shame in being bested by a daily.',
]
const lossLine = computed(() => {
  const seed = `${props.puzzleNumber}-${props.mode}`
  let h = 0
  for (let i = 0; i < seed.length; i++)
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  return LOSS_LINES[Math.abs(h) % LOSS_LINES.length]
})

// Hidden NIGHT OWL ribbon when the round closes between 0:00 and 5:00 UTC.
// Not announced, just present for late-night players to notice. Computed at
// mount-time only; doesn't tick (a player who solves at 4:59 keeps the
// ribbon for the rest of their viewing).
const isNightOwl = ref(false)

function rarityColor(rarity: string): string {
  const key = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase()
  return TIER_COLORS[key] ?? TIER_COLORS.Normal!
}

// Countdown to next UTC midnight, updated every second.
const countdown = ref('')
let timer: ReturnType<typeof setInterval> | null = null
function recompute() {
  const now = new Date()
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
  ))
  const diff = Math.max(0, next.getTime() - now.getTime())
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)
  countdown.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
onMounted(async () => {
  recompute()
  timer = setInterval(recompute, 1000)

  // Night Owl detection: any finish between 0:00 and 4:59 UTC.
  const hour = new Date().getUTCHours()
  isNightOwl.value = hour >= 0 && hour < 5

  // Auto-scroll the reveal into view so the player actually sees the
  // delight cascade play. Wait one tick for the panel's enter transition
  // to attach to the DOM. Reduced motion drops to instant scroll.
  await nextTick()
  if (revealRef.value) {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    revealRef.value.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  // Hidden delight for devtools-openers: a single console line that flags
  // the project's open-source nature. Per the delight reference's
  // "Console messages for developers" suggestion.
  if (typeof window !== 'undefined' && props.round.won) {
    // eslint-disable-next-line no-console
    console.log(
      `%c${headerWord.value}%c  ${guessCount.value}/10 in ${props.mode}.\n%cwynn.tools is open source. github.com/Wynntils/wynn.tools`,
      'font: bold 14px monospace; color: #88cc42;',
      'font: 12px monospace; color: #6f5c4f;',
      'font: 11px monospace; color: #6f5c4f;',
    )
  }
})
onBeforeUnmount(() => {
  if (timer)
    clearInterval(timer)
})
</script>

<template>
  <Transition name="reveal" appear>
    <section ref="revealRef" class="reveal" role="status" aria-live="polite">
      <header class="reveal-head" :data-won="round.won">
        <h2 class="reveal-title">
          <span class="reveal-title-text">{{ headerWord }}</span>
        </h2>
        <p class="reveal-sub">
          <template v-if="round.won">
            {{ guessCount }} / 10
            <template v-if="hintsUsed > 0">
              · {{ hintsUsed }} hint{{ hintsUsed === 1 ? '' : 's' }}
            </template>
          </template>
          <template v-else>
            {{ lossLine }}
          </template>
        </p>
      </header>

      <!-- Answer card. Placeholder treatment (rarity name) until the
           walled-garden tooltip component is wired in. -->
      <div class="answer-card">
        <span v-if="isNightOwl" class="night-owl" aria-label="Solved between midnight and 5am UTC">
          NIGHT OWL
        </span>
        <span class="answer-name" :style="{ color: rarityColor(answerRarity) }">
          {{ round.answer?.name ?? 'Unknown' }}
        </span>
        <span class="answer-rarity">{{ answerRarity }}</span>
      </div>

      <ShareGrid :round="round" :mode="mode" :puzzle-number="puzzleNumber" />

      <div class="countdown" aria-label="Time until next puzzle">
        <span class="countdown-label">Next puzzle in</span>
        <span class="countdown-time">{{ countdown }}</span>
      </div>

      <div class="reveal-footer">
        <NuxtLink to="/play/wynndle/archive" class="footer-pill">
          <ArrowLeft :size="14" :stroke-width="2.5" />
          <span>Archive</span>
        </NuxtLink>
        <NuxtLink to="/play/wynndle/leaderboard" class="footer-pill">
          <span>Leaderboard</span>
          <ArrowRight :size="14" :stroke-width="2.5" />
        </NuxtLink>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.reveal {
  grid-column: 1 / -1;
  background: var(--paper-base);
  padding: 32px 28px 26px;
  box-shadow: var(--wood-shadow-medium);
  display: grid;
  gap: 18px;
  margin-top: 4px;
  /* Land the reveal ~24px below the top of the viewport when scrollIntoView
     targets it on mount, so the envelope's wood-frame edge doesn't sit
     flush against the page top. */
  scroll-margin-top: 24px;
}

/* Header */
.reveal-head {
  text-align: center;
  display: grid;
  gap: 4px;
}

.reveal-title {
  font-family: var(--font-display);
  font-size: clamp(40px, 7vw, 64px);
  line-height: 1;
  letter-spacing: -0.01em;
  margin: 0;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.32);
}

/* One-shot shimmer ~800ms after mount. The text-shadow brightens for a
   moment, like the page acknowledging the player. Animating text-shadow
   (cheap, no layout) keeps the effect smooth. Plays once then settles. */
.reveal-title-text {
  display: inline-block;
  animation: reveal-shimmer 700ms cubic-bezier(0.165, 0.84, 0.44, 1) 600ms 1 backwards;
}

@keyframes reveal-shimmer {
  0% {
    text-shadow: 2px 2px 0 rgb(0 0 0 / 0.32);
  }
  40% {
    text-shadow:
      2px 2px 0 rgb(0 0 0 / 0.32),
      0 0 24px currentColor,
      0 0 6px currentColor;
  }
  100% {
    text-shadow: 2px 2px 0 rgb(0 0 0 / 0.32);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal-title-text {
    animation: none;
  }
}

.reveal-head[data-won='true'] .reveal-title {
  color: var(--element-valid);
}

.reveal-head[data-won='false'] .reveal-title {
  color: var(--element-danger);
}

.reveal-sub {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--paper-text);
}

/* Answer card */
.answer-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 22px 24px;
  background: var(--paper-dark);
  border: 2px solid var(--paper-bd);
  box-shadow:
    inset 0 1px 0 rgb(0 0 0 / 0.18),
    inset 0 -1px 0 var(--paper-bd-light);
}

/* Hidden NIGHT OWL ribbon. Top-right corner of the answer card, rotated
   slightly to read as a pinned label. Mono pixel font keeps it diegetic to
   the questbook chrome. Not announced, just present. */
.night-owl {
  position: absolute;
  top: -8px;
  right: -8px;
  padding: 4px 10px;
  background: var(--theme-col-dark);
  color: var(--ingot-gold);
  border: 2px solid var(--ingot-gold-dim);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  transform: rotate(4deg);
  box-shadow:
    inset 0 1px 0 var(--ingot-gold-dim),
    2px 2px 0 rgb(0 0 0 / 0.32);
  pointer-events: none;
}

.answer-name {
  font-family: var(--font-display);
  font-size: clamp(26px, 4.5vw, 42px);
  line-height: 1;
  letter-spacing: -0.01em;
  text-shadow: 2px 2px 0 rgb(0 0 0 / 0.5);
  text-align: center;
}

.answer-rarity {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  color: var(--paper-text);
  opacity: 0.7;
}

/* Countdown row */
.countdown {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgb(65 38 36 / 0.18);
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
}

.countdown-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--paper-text);
  text-transform: uppercase;
}

.countdown-time {
  font-family: var(--font-mono);
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  color: var(--paper-text-strong);
  letter-spacing: 0.06em;
}

/* Footer pills */
.reveal-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.footer-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--paper-light);
  border: 2px solid var(--paper-bd);
  color: var(--paper-text-strong);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
  transition: background-color 0.12s ease-out;
}

.footer-pill:hover {
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border-color: rgb(82 60 18);
}

.footer-pill:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Reveal mount animation: 220ms fade + slight upward slide. Disabled under
   prefers-reduced-motion via the global rule. */
.reveal-enter-active {
  transition:
    opacity 220ms cubic-bezier(0.165, 0.84, 0.44, 1),
    transform 220ms cubic-bezier(0.165, 0.84, 0.44, 1);
}

.reveal-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 720px) {
  .reveal {
    padding: 22px 16px 18px;
  }

  .countdown-time {
    font-size: 18px;
  }

  .reveal-footer {
    flex-direction: column;
  }

  .footer-pill {
    justify-content: center;
  }
}
</style>
