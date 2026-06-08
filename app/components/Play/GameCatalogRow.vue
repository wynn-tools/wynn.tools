<script setup lang="ts">
import { ArrowRight, LockKeyhole } from '@lucide/vue'

// One parchment row in the hub catalog. Wraps the medium wood-frame heft
// tier per Q17. Carries: game wordmark + blurb + per-mode status pills +
// PLAY CTA. Future locked games render with no CTA and a coming-soon badge.
//
// Pass 2 ships static placeholder status pills (Unsolved by default). Pass 3
// wires live per-mode status from the existing useWynndle + useWynndleAnon
// composables.

interface Mode {
  label: string
  href: string
  /** Live status pulled from /v1/wynndle/today by the hub page. Drives the
      pill color and label below. */
  status?: 'unsolved' | 'in-progress' | 'solved' | 'bested'
  guessCount?: number
}

const props = defineProps<{
  title: string
  blurb: string
  href: string
  locked: boolean
  modes: Mode[]
}>()

function statusLabel(m: Mode): string {
  if (m.status === 'solved')
    return `Solved · ${m.guessCount ?? 0}/10`
  if (m.status === 'bested')
    return 'Bested · 10/10'
  if (m.status === 'in-progress')
    return `In progress · ${m.guessCount ?? 0}`
  return 'Unsolved'
}

const ctaHref = computed(() => props.modes[0]?.href ?? props.href)
</script>

<template>
  <article class="row" :class="{ 'is-locked': locked }">
    <div class="row-frame">
      <div class="row-grid">
        <!-- Identity column -->
        <div class="row-id">
          <h2 class="row-title">
            {{ title }}
          </h2>
          <p class="row-blurb">
            {{ blurb }}
          </p>
        </div>

        <!-- Status pills column -->
        <div v-if="!locked" class="row-modes" aria-label="Today's status">
          <div
            v-for="m in modes"
            :key="m.href"
            class="mode-pill"
            :data-status="m.status ?? 'unsolved'"
          >
            <span class="mode-pill-label">{{ m.label }}</span>
            <span class="mode-pill-status">{{ statusLabel(m) }}</span>
          </div>
        </div>

        <!-- CTA / locked badge -->
        <div class="row-action">
          <NuxtLink v-if="!locked" :to="ctaHref" class="cta">
            <span>PLAY</span>
            <ArrowRight :size="16" :stroke-width="2.5" />
          </NuxtLink>
          <div v-else class="locked-badge">
            <LockKeyhole :size="14" :stroke-width="2" />
            <span>COMING SOON</span>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.row {
  display: block;
}

.row-frame {
  background: var(--paper-base);
  padding: 24px 28px;
  box-shadow: var(--wood-shadow-medium);
}

.row.is-locked .row-frame {
  background: var(--paper-dark);
  opacity: 0.78;
}

.row-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) auto auto;
  gap: 24px;
  align-items: center;
}

.row-id {
  min-width: 0;
}

.row-title {
  font-family: var(--font-display);
  font-size: 36px;
  line-height: 1;
  letter-spacing: -0.01em;
  color: var(--paper-text-strong);
  margin: 0 0 6px;
  text-shadow: 1.5px 1.5px 0 rgb(0 0 0 / 0.18);
}

.row-blurb {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.5;
  color: var(--paper-text);
  margin: 0;
  max-width: 50ch;
}

/* Status pills column: vertical stack of mode pills, each shaped like the
   inventory mini-slot. Color comes from the cell trio (gold for in-progress,
   green for solved, neutral for unsolved). */
.row-modes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}

.mode-pill {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 12px;
  background: var(--paper-light);
  border: 2px solid var(--paper-bd);
  box-shadow: inset 0 1px 0 var(--paper-bd-light);
}

.mode-pill[data-status='in-progress'] {
  background: var(--element-warning);
  border-color: var(--element-warning-sub);
  color: rgb(255 255 255);
  box-shadow:
    inset 0 1px 0 var(--element-warning-hover),
    inset 0 -1px 0 rgb(0 0 0 / 0.18);
}

.mode-pill[data-status='solved'] {
  background: var(--element-valid);
  border-color: var(--element-valid-sub);
  color: rgb(255 255 255);
  box-shadow:
    inset 0 1px 0 var(--element-valid-hover),
    inset 0 -1px 0 rgb(0 0 0 / 0.18);
}

.mode-pill[data-status='bested'] {
  background: var(--element-danger);
  border-color: var(--element-danger-sub);
  color: rgb(255 255 255);
  box-shadow:
    inset 0 1px 0 var(--element-danger-hover),
    inset 0 -1px 0 rgb(0 0 0 / 0.18);
}

.mode-pill-label {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: inherit;
}

.mode-pill-status {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  opacity: 0.85;
  color: inherit;
}

/* Play CTA: gold-edged parchment pill, the visual analog of Wynncraft's
   `--img-nav-gold-button-bg` treatment. Carries an arrow that nudges right
   on hover (the one permitted micro-motion in the envelope per Q16). */
.cta {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  background: var(--ingot-gold-dim);
  color: rgb(40 26 8);
  border: 2px solid rgb(82 60 18);
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 0.1em;
  text-decoration: none;
  white-space: nowrap;
  box-shadow:
    inset 0 1px 0 var(--ingot-gold),
    inset 0 -2px 0 rgb(120 86 14);
  transition: background-color 0.12s ease-out;
}

.cta:hover {
  background: var(--ingot-gold);
}

.cta:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
}

.cta svg {
  transition: transform 0.18s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.cta:hover svg {
  transform: translateX(3px);
}

.locked-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 2px solid var(--paper-bd);
  background: rgb(65 38 36 / 0.18);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--paper-text);
}

@media (max-width: 720px) {
  .row-frame {
    padding: 18px 16px;
  }

  .row-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .row-title {
    font-size: 28px;
  }

  .row-modes {
    min-width: 0;
  }

  .cta {
    width: 100%;
    justify-content: center;
  }
}
</style>
