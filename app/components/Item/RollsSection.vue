<script setup lang="ts">
import type { SearchItem } from '~/lib/items-search/types'
import type {
  Augment,
  RequirementSet,
  RolledItem,
} from '~/lib/items/roll-simulator'
import type {
  WorkerOutbound,
  WorkerStartMessage,
} from '~/lib/items/roll-worker'
import { humanizeField, isInverted } from '~/lib/data/identifications'
import {
  activeRequirementCount,
  rollItem,
} from '~/lib/items/roll-simulator'
import RollWorker from '~/lib/items/roll-worker?worker'

const props = defineProps<{ item: SearchItem }>()

const variableKeys = computed(() => {
  return Object.entries(props.item.identifications)
    .filter(([, r]) => r.min !== r.max)
    .map(([k]) => k)
})

const variableBase = computed<Record<string, typeof props.item.identifications[string]>>(() => {
  const out: Record<string, typeof props.item.identifications[string]> = {}
  for (const k of variableKeys.value)
    out[k] = props.item.identifications[k]!
  return out
})

const ampTier = ref(0)
const augment = ref<Augment>('none')
const lockedId = ref<string | null>(null)
const rerollCount = ref(0)
const current = ref<RolledItem>({ rolledIds: {}, overall: 0 })

const requirementsOpen = ref(false)
const requirements = ref<RequirementSet>({
  overall: { enabled: false, value: null, direction: 'gte' },
  perId: {},
})

const autoRolling = ref(false)
const autoStatus = ref<string | null>(null)
const autoAttempts = ref(0)
const autoRps = ref(0)
const autoMet = ref(false)

let workers: Worker[] = []
let attemptsByWorker: number[] = []
let startTime = 0
let foundResult = false

function seedRequirementsForItem() {
  const perId: RequirementSet['perId'] = {}
  for (const k of variableKeys.value)
    perId[k] = { enabled: false, value: null, direction: 'gte' }
  requirements.value = {
    overall: { enabled: false, value: null, direction: 'gte' },
    perId,
  }
}

function freshRoll(prev: Record<string, ReturnType<typeof rollItem>['rolledIds'][string]> | null = null): RolledItem {
  return rollItem(variableBase.value, {
    ampTier: ampTier.value,
    augment: augment.value,
    lockedId: lockedId.value,
    previous: prev,
  })
}

function doRoll() {
  if (autoRolling.value)
    return
  current.value = freshRoll(current.value.rolledIds)
  if (augment.value !== 'simulator')
    rerollCount.value++
  autoStatus.value = null
  autoMet.value = false
}

function teardownWorkers() {
  for (const w of workers) {
    try {
      w.postMessage('stop')
    }
    catch { /* worker already dead */ }
    w.terminate()
  }
  workers = []
  attemptsByWorker = []
}

function stopAutoRoll() {
  if (!autoRolling.value)
    return
  teardownWorkers()
  autoRolling.value = false
  autoStatus.value = `Stopped at ${autoAttempts.value.toLocaleString()} rolls.`
}

function startAutoRoll() {
  if (autoRolling.value)
    return
  if (activeRequirementCount(requirements.value) === 0) {
    requirementsOpen.value = true
    autoStatus.value = 'Set at least one requirement to auto-roll.'
    return
  }

  autoRolling.value = true
  autoMet.value = false
  autoAttempts.value = 0
  autoRps.value = 0
  autoStatus.value = 'Starting workers…'
  foundResult = false
  startTime = performance.now()

  const threadCount = Math.max(1, Math.min(navigator.hardwareConcurrency || 4, 16))
  attemptsByWorker = Array.from<number>({ length: threadCount }).fill(0)
  workers = []

  const base = toRaw(variableBase.value)
  const reqs = structuredClone(toRaw(requirements.value))
  const previous = structuredClone(toRaw(current.value.rolledIds))

  for (let i = 0; i < threadCount; i++) {
    const w = new RollWorker()
    workers.push(w)
    w.onmessage = (e: MessageEvent<WorkerOutbound>) => onWorkerMessage(e.data, threadCount)
    w.onerror = (err) => {
      console.error('Roll worker error', err)
      stopAutoRoll()
    }
    const start: WorkerStartMessage = {
      type: 'start',
      workerId: i,
      base,
      options: {
        ampTier: ampTier.value,
        augment: augment.value,
        lockedId: lockedId.value,
        previous,
      },
      requirements: reqs,
      progressEvery: 20000,
    }
    w.postMessage(start)
  }
}

function onWorkerMessage(msg: WorkerOutbound, threadCount: number) {
  if (foundResult)
    return
  attemptsByWorker[msg.workerId] = msg.attempts
  const total = attemptsByWorker.reduce((a, b) => a + b, 0)
  const elapsed = (performance.now() - startTime) / 1000
  autoAttempts.value = total
  autoRps.value = elapsed > 0 ? Math.round(total / elapsed) : 0

  if (msg.type === 'success') {
    foundResult = true
    current.value = msg.item
    if (augment.value !== 'simulator')
      rerollCount.value += total
    autoStatus.value = `Met requirements in ${total.toLocaleString()} rolls.`
    autoMet.value = true
    teardownWorkers()
    autoRolling.value = false
    return
  }
  if (msg.type === 'progress') {
    current.value = msg.item
    autoStatus.value = `Rolling… ${total.toLocaleString()} attempts (${autoRps.value.toLocaleString()}/sec, ${threadCount} threads)`
    return
  }
  if (msg.type === 'stopped' && msg.item) {
    current.value = msg.item
  }
}

watch(() => props.item, () => {
  seedRequirementsForItem()
  ampTier.value = 0
  augment.value = 'none'
  lockedId.value = null
  rerollCount.value = 0
  autoStatus.value = null
  autoMet.value = false
  current.value = freshRoll(null)
}, { immediate: true })

onBeforeUnmount(() => teardownWorkers())

const showAugmentTarget = computed(() => augment.value === 'insulator' || augment.value === 'isolator')
const targetLabel = computed(() => augment.value === 'insulator' ? 'Lock' : 'Reroll only')

watch(augment, () => {
  lockedId.value = null
})

const overallVar = computed(() => qualityVar(current.value.overall))
const overallStars = computed(() => starsForOverall(current.value.overall))

function qualityVar(p: number): string {
  if (p >= 95)
    return 'var(--color-accent)'
  if (p >= 71)
    return 'var(--color-good)'
  if (p >= 30)
    return 'var(--color-muted)'
  return 'var(--color-bad)'
}

function starsForOverall(p: number): number {
  if (p >= 100)
    return 3
  if (p >= 95)
    return 2
  if (p >= 71)
    return 1
  return 0
}

interface DisplayRow {
  key: string
  label: string
  unit: string
  min: number
  max: number
  raw: number
  rolledRaw: number
  rolledPct: number
  rolledStar: 0 | 1 | 2 | 3
  good: boolean
}

const displayRows = computed<DisplayRow[]>(() => {
  return variableKeys.value.map((key) => {
    const r = props.item.identifications[key]!
    const { label, unit } = humanizeField(key)
    const rolled = current.value.rolledIds[key]
    const inverted = isInverted(key)
    const valuePositive = (rolled?.raw ?? r.raw) > 0
    return {
      key,
      label,
      unit,
      min: r.min,
      max: r.max,
      raw: r.raw,
      rolledRaw: rolled?.raw ?? 0,
      rolledPct: rolled?.percent ?? 0,
      rolledStar: rolled?.star ?? 0,
      good: inverted ? !valuePositive : valuePositive,
    }
  })
})

function rowMetTarget(key: string): boolean {
  const req = requirements.value.perId[key]
  if (!req?.enabled || req.value == null)
    return false
  const rolled = current.value.rolledIds[key]
  if (!rolled)
    return false
  return req.direction === 'gte' ? rolled.percent >= req.value : rolled.percent <= req.value
}

function formatRolled(row: DisplayRow): string {
  const sign = row.rolledRaw > 0 ? '+' : ''
  return `${sign}${row.rolledRaw}${row.unit}`
}

function toggleAllReqs(direction: 'enable' | 'disable') {
  const r = requirements.value
  if (direction === 'enable') {
    r.overall.enabled = true
  }
  else {
    r.overall.enabled = false
    for (const k of Object.keys(r.perId))
      r.perId[k]!.enabled = false
  }
}

const activeReqCount = computed(() => activeRequirementCount(requirements.value))

const AMP_LABELS = ['0', 'I', 'II', 'III', 'IV']
const AUGMENTS: { value: Augment, label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'insulator', label: 'Insulator' },
  { value: 'isolator', label: 'Isolator' },
  { value: 'simulator', label: 'Simulator' },
]

function onKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)
    return
  if (e.key === 'r' || e.key === 'R') {
    if (e.shiftKey) {
      if (autoRolling.value)
        stopAutoRoll()
      else
        startAutoRoll()
    }
    else if (!autoRolling.value) {
      doRoll()
    }
    e.preventDefault()
  }
  else if (e.key === 'Escape' && autoRolling.value) {
    stopAutoRoll()
    e.preventDefault()
  }
}
</script>

<template>
  <section v-if="variableKeys.length" class="rolls" @keydown="onKeydown">
    <header class="head">
      <h2 class="kicker">
        Identification
      </h2>
      <div class="overall" :class="{ 'overall--met': autoMet }">
        <span class="overall-pct" :style="{ color: autoMet ? 'var(--color-accent)' : overallVar }">
          {{ current.overall.toFixed(1) }}<span class="overall-pct-unit">%</span>
        </span>
        <span class="overall-stars" :aria-label="`${overallStars} of 3 stars`">
          <span
            v-for="i in 3"
            :key="i"
            class="star"
            :class="{ 'star--filled': i <= overallStars }"
          >★</span>
        </span>
        <span v-if="autoRolling" class="overall-pulse" aria-hidden="true" />
      </div>
    </header>

    <div class="rail">
      <div class="rail-group">
        <span class="rail-label">Amp</span>
        <div class="amp-tabs" role="tablist" aria-label="Amplifier tier">
          <button
            v-for="(label, i) in AMP_LABELS"
            :key="i"
            type="button"
            role="tab"
            :aria-selected="ampTier === i"
            class="amp-tab"
            :class="{ 'amp-tab--on': ampTier === i }"
            @click="ampTier = i"
          >
            {{ label }}
          </button>
        </div>
      </div>
      <div class="rail-group">
        <label class="rail-label" for="augment">Augment</label>
        <select id="augment" v-model="augment" class="select">
          <option v-for="a in AUGMENTS" :key="a.value" :value="a.value">
            {{ a.label }}
          </option>
        </select>
      </div>
      <div v-if="showAugmentTarget" class="rail-group">
        <label class="rail-label" for="aug-target">{{ targetLabel }}</label>
        <select id="aug-target" v-model="lockedId" class="select">
          <option :value="null">
            Choose ID…
          </option>
          <option v-for="row in displayRows" :key="row.key" :value="row.key">
            {{ row.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="actions">
      <button
        type="button"
        class="btn btn--primary"
        :disabled="autoRolling"
        @click="doRoll"
      >
        Roll
        <span class="btn-key" aria-hidden="true">R</span>
      </button>
      <button
        type="button"
        class="btn"
        :class="{ 'btn--danger': autoRolling }"
        @click="autoRolling ? stopAutoRoll() : startAutoRoll()"
      >
        {{ autoRolling ? 'Stop' : 'Roll until met' }}
        <span class="btn-key" aria-hidden="true">⇧R</span>
      </button>
      <span class="counter">Rerolls <strong>{{ rerollCount.toLocaleString() }}</strong></span>
      <span v-if="autoStatus" class="status">{{ autoStatus }}</span>
    </div>

    <ul class="id-list">
      <li
        v-for="row in displayRows"
        :key="row.key"
        class="id-row"
        :class="{
          'id-row--locked': lockedId === row.key && showAugmentTarget,
          'id-row--met': rowMetTarget(row.key),
        }"
      >
        <div class="id-top">
          <span class="id-value" :style="{ color: row.good ? 'var(--color-good)' : 'var(--color-bad)' }">
            <span v-if="lockedId === row.key && showAugmentTarget" class="lock-pin" aria-hidden="true">⏺</span>
            {{ formatRolled(row) }}
            <span class="id-stars" aria-hidden="true">
              <span
                v-for="i in 3"
                :key="i"
                class="row-star"
                :class="{ 'row-star--filled': i <= row.rolledStar }"
              >★</span>
            </span>
          </span>
          <span class="id-name">{{ row.label }}</span>
          <span class="id-pct" :style="{ color: qualityVar(row.rolledPct) }">{{ row.rolledPct.toFixed(0) }}%</span>
        </div>
        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{ width: `${row.rolledPct}%`, background: qualityVar(row.rolledPct) }"
          />
          <div class="bar-marker" style="left: 71%" />
          <div class="bar-marker bar-marker--2" style="left: 95%" />
        </div>
        <div class="id-range">
          {{ row.min }}{{ row.unit }} → {{ row.max }}{{ row.unit }}
        </div>
      </li>
    </ul>

    <details
      :open="requirementsOpen"
      class="reqs"
      @toggle="(e) => (requirementsOpen = (e.target as HTMLDetailsElement).open)"
    >
      <summary class="reqs-summary">
        <span>Set roll requirements</span>
        <span v-if="activeReqCount > 0" class="reqs-active">{{ activeReqCount }} active</span>
      </summary>

      <div class="reqs-body">
        <div class="reqs-toolbar">
          <button type="button" class="reqs-tool" @click="toggleAllReqs('disable')">
            Clear all
          </button>
        </div>

        <ItemReqRow
          label="Overall"
          :requirement="requirements.overall"
          :current-pct="current.overall"
          @update="(r) => (requirements.overall = r)"
        />
        <ItemReqRow
          v-for="row in displayRows"
          :key="row.key"
          :label="row.label"
          :requirement="requirements.perId[row.key]!"
          :current-pct="row.rolledPct"
          @update="(r) => (requirements.perId[row.key] = r)"
        />
      </div>
    </details>
  </section>
</template>

<style scoped>
.rolls {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  padding: 18px 20px 18px;
}

.head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}
.kicker {
  margin: 0;
  line-height: 1;
}
.overall {
  margin-left: auto;
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  position: relative;
}
.overall-pct {
  font: 600 26px/1 var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  transition: color 0.12s ease-out;
}
.overall-pct-unit {
  font-size: 14px;
  margin-left: 1px;
  color: var(--color-faint);
}
.overall-stars {
  display: inline-flex;
  gap: 1px;
}
.star {
  font-size: 13px;
  color: color-mix(in oklch, var(--color-gold-dim) 30%, var(--color-faint));
  line-height: 1;
  transition: color 0.12s ease-out;
}
.star--filled {
  color: var(--color-gold);
}
.overall-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 0 color-mix(in oklch, var(--color-accent) 40%, transparent);
  animation: pulse 1.4s ease-out infinite;
  margin-left: 4px;
}
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in oklch, var(--color-accent) 55%, transparent);
    opacity: 1;
  }
  70% {
    box-shadow: 0 0 0 8px color-mix(in oklch, var(--color-accent) 0%, transparent);
    opacity: 0.7;
  }
  100% {
    box-shadow: 0 0 0 0 color-mix(in oklch, var(--color-accent) 0%, transparent);
    opacity: 1;
  }
}

.rail {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid color-mix(in oklch, var(--color-border) 60%, transparent);
}
.rail-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.rail-label {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
}

.amp-tabs {
  display: inline-flex;
  padding: 2px;
  background: color-mix(in oklch, var(--color-bg) 60%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}
.amp-tab {
  font: 600 11px/1 var(--font-mono);
  letter-spacing: 0.08em;
  padding: 5px 10px;
  border-radius: 4px;
  background: transparent;
  color: var(--color-muted);
  border: 0;
  cursor: pointer;
  transition:
    color 0.12s ease-out,
    background 0.12s ease-out;
}
.amp-tab:hover {
  color: var(--color-text);
}
.amp-tab--on {
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 10%, transparent);
}

.select {
  font: 500 12px/1 var(--font-mono);
  background: color-mix(in oklch, var(--color-bg) 60%, transparent);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
  transition: border-color 0.12s ease-out;
}
.select:hover {
  border-color: var(--color-faint);
}
.select:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
  border-color: var(--color-accent);
}

.actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font: 600 12px/1 var(--font-mono);
  letter-spacing: 0.08em;
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition:
    border-color 0.12s ease-out,
    color 0.12s ease-out,
    background 0.12s ease-out;
}
.btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.btn:disabled {
  opacity: 0.5;
  cursor: default;
  border-color: var(--color-border);
  color: var(--color-faint);
}
.btn--primary {
  border-color: color-mix(in oklch, var(--color-accent) 45%, var(--color-border));
  color: var(--color-accent);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}
.btn--primary:hover {
  background: color-mix(in oklch, var(--color-accent) 14%, transparent);
}
.btn--danger {
  border-color: color-mix(in oklch, var(--color-bad) 50%, var(--color-border));
  color: var(--color-bad);
}
.btn--danger:hover {
  border-color: var(--color-bad);
  color: var(--color-bad);
  background: color-mix(in oklch, var(--color-bad) 10%, transparent);
}
.btn-key {
  font-size: 9px;
  letter-spacing: 0.04em;
  color: var(--color-faint);
  margin-left: 2px;
}

.counter {
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  margin-left: 4px;
}
.counter strong {
  color: var(--color-muted);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}
.status {
  font: 500 11px/1.4 var(--font-mono);
  color: var(--color-muted);
  flex-basis: 100%;
  font-variant-numeric: tabular-nums;
}

.id-list {
  list-style: none;
  padding: 0;
  margin: 0 0 6px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.id-row {
  padding: 4px 6px;
  border-radius: 4px;
  transition: background 0.12s ease-out;
}
.id-row--met {
  background: color-mix(in oklch, var(--color-accent) 4%, transparent);
}
.id-row--locked .id-value {
  text-shadow: 0 0 8px color-mix(in oklch, var(--color-accent) 35%, transparent);
}
.id-top {
  display: grid;
  grid-template-columns: minmax(120px, auto) 1fr auto;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 4px;
}
.id-value {
  font: 600 13px/1 var(--font-mono);
  font-variant-numeric: tabular-nums;
  transition: color 0.12s ease-out;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.lock-pin {
  color: var(--color-accent);
  font-size: 9px;
  vertical-align: super;
}
.id-stars {
  display: inline-flex;
  gap: 1px;
  margin-left: 2px;
}
.row-star {
  font-size: 9px;
  color: color-mix(in oklch, var(--color-gold-dim) 20%, var(--color-faint));
  line-height: 1;
  transition: color 0.12s ease-out;
}
.row-star--filled {
  color: var(--color-gold);
}
.id-name {
  color: var(--color-text);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.id-pct {
  font: 500 11px/1 var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  transition: color 0.12s ease-out;
}

.bar-track {
  position: relative;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: visible;
}
.bar-fill {
  height: 100%;
  border-radius: 2px;
  transition:
    width 0.18s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.12s ease-out;
}
.id-row--met .bar-fill {
  box-shadow: 0 0 0 1px color-mix(in oklch, var(--color-accent) 45%, transparent);
}
.bar-marker {
  position: absolute;
  top: -3px;
  width: 1px;
  height: 10px;
  background: var(--color-faint);
  pointer-events: none;
  opacity: 0.6;
}
.bar-marker--2 {
  opacity: 0.9;
}
.id-range {
  font: 400 10px/1 var(--font-mono);
  color: var(--color-faint);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.reqs {
  border-top: 1px solid color-mix(in oklch, var(--color-border) 60%, transparent);
  padding-top: 12px;
  margin-top: 6px;
}
.reqs-summary {
  font: 500 11px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-muted);
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 8px;
  list-style: none;
  padding: 4px 0;
  transition: color 0.12s ease-out;
}
.reqs-summary:hover {
  color: var(--color-text);
}
.reqs-summary::-webkit-details-marker {
  display: none;
}
.reqs-summary::before {
  content: '▸';
  font-size: 9px;
  color: var(--color-faint);
  transition: transform 0.15s ease-out;
}
.reqs[open] .reqs-summary::before {
  transform: rotate(90deg);
}
.reqs-active {
  font-size: 10px;
  color: var(--color-accent);
  padding: 2px 7px;
  border-radius: 3px;
  background: color-mix(in oklch, var(--color-accent) 10%, transparent);
}
.reqs-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.reqs-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2px;
}
.reqs-tool {
  background: none;
  border: 0;
  font: 500 10px/1 var(--font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-faint);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: color 0.12s ease-out;
}
.reqs-tool:hover {
  color: var(--color-text);
}

@media (max-width: 720px) {
  .rolls {
    padding: 14px 14px 14px;
  }
  .overall-pct {
    font-size: 22px;
  }
  .rail {
    gap: 10px;
  }
  .id-top {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'name pct'
      'value pct';
  }
  .id-value {
    grid-area: value;
  }
  .id-name {
    grid-area: name;
  }
  .id-pct {
    grid-area: pct;
    align-self: center;
  }
  .id-range {
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .overall-pulse {
    animation: none;
    opacity: 0.8;
  }
  .bar-fill,
  .overall-pct,
  .id-value,
  .id-pct,
  .row-star,
  .star {
    transition: none;
  }
}
</style>
