<script setup lang="ts">
import { computed, ref } from 'vue'
import { levelToSkillPoints, SKILLPOINT_FINAL_MULT, skillPointsToPercentage } from '~/lib/math/skillpoints'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const ATTRS = [
  { key: 'str', label: 'Str', full: 'Strength', color: 'oklch(72% 0.18 145)', effect: 'dmg' },
  { key: 'dex', label: 'Dex', full: 'Dexterity', color: 'oklch(82% 0.15 95)', effect: 'crit' },
  { key: 'int', label: 'Int', full: 'Intelligence', color: 'oklch(75% 0.13 215)', effect: 'cost' },
  { key: 'def', label: 'Def', full: 'Defence', color: 'oklch(68% 0.18 35)', effect: 'res' },
  { key: 'agi', label: 'Agi', full: 'Agility', color: 'oklch(85% 0.04 250)', effect: 'dodge' },
] as const

const assigned = computed<number[]>(() => {
  const r = store.result
  if (!r)
    return [0, 0, 0, 0, 0]
  return store.skillpoints.map((sp, i) =>
    sp - r.skillpoints.finalSkillpoints[i]! + r.skillpoints.baseSkillpoints[i]!,
  )
})

const totalAssigned = computed(() => assigned.value.reduce((a, b) => a + b, 0))
const available = computed(() => levelToSkillPoints(store.rawBuild?.level ?? 1))
const remaining = computed(() => available.value - totalAssigned.value)

// Feasibility status drives the SP box tint + hover detail. Manual over-assignment
// (remaining < 0) is its own red state; otherwise the computed feasibility warning
// (insufficient / over-cap / needs the guild tome) classifies the box.
const warning = computed(() => store.result?.spWarning ?? null)
const boxStatus = computed<'ok' | 'warn' | 'error' | 'over'>(() => {
  if (remaining.value < 0)
    return 'over'
  const s = warning.value?.status
  if (s === 'needs-tomes')
    return 'warn'
  if (s === 'over-cap' || s === 'insufficient')
    return 'error'
  return 'ok'
})
const tipTitle = computed(() => {
  if (boxStatus.value === 'over')
    return 'Over-assigned'
  return warning.value?.message ?? ''
})
const tipText = computed(() => {
  if (boxStatus.value === 'over') {
    const n = -remaining.value
    return `You've assigned ${n} more skill point${n === 1 ? '' : 's'} than your level grants.`
  }
  return warning.value?.detail ?? ''
})
const hasTip = computed(() => boxStatus.value !== 'ok' && tipText.value !== '')
const showTip = ref(false)

const skillEffect = computed(() =>
  store.skillpoints.map((sp, i) =>
    (skillPointsToPercentage(sp) * 100 * SKILLPOINT_FINAL_MULT[i]!).toFixed(1),
  ),
)

function onSkp(i: number, e: Event) {
  store.setSkillpoint(i, Number.parseInt((e.target as HTMLInputElement).value) || 0)
}

function onLevel(e: Event) {
  const v = Number.parseInt((e.target as HTMLInputElement).value)
  if (!Number.isNaN(v))
    store.setLevel(v)
}
</script>

<template>
  <section class="sp">
    <div class="sp-head">
      <div class="sp-level-field">
        <label class="sp-kicker" for="level">Level</label>
        <input
          id="level"
          type="number"
          class="sp-level-input"
          :value="store.rawBuild?.level"
          @input="onLevel($event)"
        >
      </div>
      <div
        class="sp-remaining-info"
        :class="[`sp-remaining-info--${boxStatus}`, { 'sp-remaining-info--interactive': hasTip }]"
        :tabindex="hasTip ? 0 : undefined"
        :role="hasTip ? 'button' : undefined"
        :aria-label="hasTip ? `${tipTitle}. ${tipText}` : undefined"
        @mouseenter="showTip = hasTip"
        @mouseleave="showTip = false"
        @focus="showTip = hasTip"
        @blur="showTip = false"
      >
        <span v-if="boxStatus !== 'ok'" class="sp-flag" aria-hidden="true">{{ boxStatus === 'warn' ? '▲' : '✕' }}</span>
        <span class="sp-remaining">{{ remaining }}</span>
        <span class="sp-remaining-label">/ {{ available }} SP</span>

        <transition name="sp-tip">
          <div v-if="showTip" class="sp-tip" role="tooltip">
            <span class="sp-tip-title">{{ tipTitle }}</span>
            <span class="sp-tip-body">{{ tipText }}</span>
          </div>
        </transition>
      </div>
    </div>

    <ul class="sp-attrs">
      <li
        v-for="(a, i) in ATTRS"
        :key="a.key"
        class="sp-attr"
        :style="{ '--attr-color': a.color }"
      >
        <span class="sp-attr-label">{{ a.label }}</span>
        <input
          :id="`skp-${i}`"
          type="number"
          class="sp-attr-input"
          :value="store.skillpoints[i]"
          :aria-label="a.full"
          @input="onSkp(i, $event)"
        >
        <span class="sp-attr-eff">{{ skillEffect[i] }}%</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.sp {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sp-level-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sp-kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  cursor: default;
}

.sp-level-input {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 3px 7px;
  width: 54px;
  text-align: right;
  outline: none;
  transition:
    border-color 0.12s,
    color 0.12s;
}
.sp-level-input:focus {
  border-color: var(--color-copper);
  color: var(--color-copper);
}

.sp-remaining-info {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 2px 7px;
  margin: -2px -3px;
  border: 1px solid transparent;
  border-radius: 5px;
  transition:
    border-color 0.12s,
    background 0.12s,
    color 0.12s;
}
.sp-remaining-info--interactive {
  cursor: help;
}
.sp-remaining-info--interactive:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

/* warn = amber (works, but depends on the guild tome); error/over = red. */
.sp-remaining-info--warn {
  border-color: oklch(70% 0.14 75 / 0.5);
  background: oklch(70% 0.14 75 / 0.08);
}
.sp-remaining-info--error,
.sp-remaining-info--over {
  border-color: oklch(62% 0.16 22 / 0.5);
  background: oklch(62% 0.16 22 / 0.08);
}

.sp-flag {
  font-size: 9px;
  line-height: 1;
  align-self: center;
}
.sp-remaining-info--warn .sp-flag {
  color: oklch(78% 0.14 75);
}
.sp-remaining-info--error .sp-flag,
.sp-remaining-info--over .sp-flag {
  color: oklch(66% 0.18 22);
}

.sp-remaining {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.sp-remaining-info--warn .sp-remaining {
  color: oklch(80% 0.13 75);
}
.sp-remaining-info--error .sp-remaining,
.sp-remaining-info--over .sp-remaining {
  color: oklch(68% 0.16 22);
}
.sp-remaining-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  color: var(--color-faint);
  letter-spacing: 0.04em;
}

/* Hover/focus detail. Anchored to the right edge of the box so a ~260px panel
   keeps it inside the column. */
.sp-tip {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  width: max(240px, 100%);
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 11px;
  background: var(--color-surface-hi);
  border: 1px solid var(--color-border);
  border-radius: 7px;
  box-shadow: 0 4px 20px oklch(0% 0 0 / 0.35);
  text-align: left;
}
.sp-tip-title {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-text);
}
.sp-tip-body {
  font-size: 11px;
  line-height: 1.45;
  color: var(--color-muted);
}

.sp-tip-enter-active,
.sp-tip-leave-active {
  transition:
    opacity 0.12s ease-out,
    transform 0.12s ease-out;
}
.sp-tip-enter-from,
.sp-tip-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
@media (prefers-reduced-motion: reduce) {
  .sp-tip-enter-active,
  .sp-tip-leave-active {
    transition: none;
  }
}

.sp-attrs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
}

.sp-attr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px 6px;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  background: color-mix(in oklch, var(--color-bg) 40%, transparent);
  transition:
    border-color 0.12s,
    background 0.12s;
}
.sp-attr:focus-within {
  border-color: var(--attr-color);
  background: var(--color-surface);
}

.sp-attr-label {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--attr-color);
}

.sp-attr-input {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  background: transparent;
  border: none;
  padding: 0;
  width: 100%;
  text-align: center;
  outline: none;
  transition: color 0.12s;
}
.sp-attr:focus-within .sp-attr-input {
  color: var(--attr-color);
}

.sp-attr-eff {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 9px;
  color: var(--color-faint);
  text-align: center;
  white-space: nowrap;
}

/* Hide number spinners */
.sp-attr-input::-webkit-outer-spin-button,
.sp-attr-input::-webkit-inner-spin-button,
.sp-level-input::-webkit-outer-spin-button,
.sp-level-input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}
.sp-attr-input[type='number'],
.sp-level-input[type='number'] {
  appearance: textfield;
}

@media (max-width: 720px) {
  .sp {
    padding: 8px 10px;
    gap: 6px;
  }
  .sp-attrs {
    gap: 4px;
  }
  .sp-attr {
    padding: 4px 4px;
  }
  .sp-attr-input {
    font-size: 13px;
  }
}

@media (max-width: 380px) {
  .sp-attrs {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
