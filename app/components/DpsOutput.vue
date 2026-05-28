<script setup lang="ts">
import type { BuildResult } from '~/lib/build/compute-build'
import { computed, ref } from 'vue'

const props = defineProps<{ result: BuildResult }>()

const open = ref<Record<string, boolean>>({ melee: true })

function toggle(key: string) {
  open.value = { ...open.value, [key]: !open.value[key] }
}

function fmt(n: number, digits = 0) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

// Stay reactive: a plain destructure freezes on the first BuildResult passed
// in, so DPS would only refresh on full hash reload (not on inline atree edits).
const melee = computed(() => props.result.melee)
</script>

<template>
  <section class="output">
    <header class="output-head">
      <span class="kicker">Combat Output</span>
      <span class="headline mono">{{ fmt(melee.averageDps) }} <span class="headline-unit">DPS</span></span>
    </header>

    <ul class="acc">
      <li class="acc-item" :class="{ 'acc-item--open': open.melee }">
        <button class="acc-trigger" type="button" @click="toggle('melee')">
          <span class="acc-chevron" :class="{ 'acc-chevron--open': open.melee }">▸</span>
          <span class="acc-title">Melee</span>
          <span class="acc-value mono">{{ fmt(melee.averageDps) }}</span>
        </button>
        <div v-if="open.melee" class="acc-body">
          <div class="row">
            <span class="label">Attack Speed</span>
            <span class="value mono">{{ melee.attackSpeed }}</span>
          </div>
          <div class="row">
            <span class="label">Per Attack</span>
            <span class="value mono">{{ fmt(melee.perAttack, 0) }}</span>
          </div>
          <div class="row">
            <span class="label">Average DPS</span>
            <span class="value value--copper mono">{{ fmt(melee.averageDps, 0) }}</span>
          </div>
        </div>
      </li>

      <li class="acc-item acc-item--placeholder">
        <div class="acc-trigger acc-trigger--disabled">
          <span class="acc-chevron acc-chevron--disabled">▸</span>
          <span class="acc-title acc-title--disabled">Spell DPS breakdown</span>
          <span class="acc-value acc-value--placeholder mono">soon</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.output {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.output-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kicker {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.headline {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 30px;
  font-weight: 600;
  color: var(--color-copper);
  letter-spacing: -0.01em;
  line-height: 1;
}

.headline-unit {
  font-size: 12px;
  color: var(--color-muted);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 500;
  margin-left: 4px;
}

.acc {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.acc-item {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.12s;
}

.acc-item--open {
  border-color: oklch(52% 0.12 48);
}

.acc-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
  font-family: inherit;
}

.acc-trigger:hover {
  background: oklch(19% 0.008 30 / 0.6);
}

.acc-trigger--disabled {
  cursor: default;
}
.acc-trigger--disabled:hover {
  background: transparent;
}

.acc-chevron {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-muted);
  transition: transform 0.15s ease-out;
  width: 12px;
  text-align: center;
}

.acc-chevron--open {
  transform: rotate(90deg);
  color: var(--color-copper);
}

.acc-chevron--disabled {
  color: var(--color-faint);
  opacity: 0.5;
}

.acc-title {
  flex: 1;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text);
}

.acc-title--disabled {
  color: var(--color-faint);
}

.acc-value {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-copper);
}

.acc-value--placeholder {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-faint);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.acc-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 12px 12px 34px;
  border-top: 1px solid var(--color-border);
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.label {
  font-size: 12px;
  color: var(--color-muted);
}

.value {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  color: var(--color-text);
}

.value--copper {
  color: var(--color-copper);
  font-weight: 600;
}

.mono {
  font-family: 'Geist Mono', 'Courier New', monospace;
}
</style>
