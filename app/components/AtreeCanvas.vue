<script setup lang="ts">
import type { AtreeNode } from '~/lib/atree/build-atree'
import { computed } from 'vue'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const CELL = 44 // px

const rows = computed(() => {
  if (!store.atreeNodes.length)
    return 0
  return Math.max(...store.atreeNodes.map(n => n.ability.display.row)) + 1
})

const cols = computed(() => {
  if (!store.atreeNodes.length)
    return 0
  return Math.max(...store.atreeNodes.map(n => n.ability.display.col)) + 1
})

const gridWidth = computed(() => cols.value * CELL)
const gridHeight = computed(() => rows.value * CELL)

function cellCenter(row: number, col: number) {
  return {
    x: col * CELL + CELL / 2,
    y: row * CELL + CELL / 2,
  }
}

interface Connector {
  points: string
  active: boolean
}

const connectors = computed<Connector[]>(() => {
  const result: Connector[] = []
  for (const node of store.atreeNodes) {
    const childRow = node.ability.display.row
    const childCol = node.ability.display.col
    const child = cellCenter(childRow, childCol)
    for (const parent of node.parents as AtreeNode[]) {
      const parentRow = parent.ability.display.row
      const parentCol = parent.ability.display.col
      const par = cellCenter(parentRow, parentCol)
      // Elbow: child center → up/down to parent's row → across to parent center
      const elbowY = par.y
      const points = `${child.x},${child.y} ${child.x},${elbowY} ${par.x},${elbowY} ${par.x},${par.y}`
      const active = store.isAtreeActive(node.ability.id) && store.isAtreeActive(parent.ability.id)
      result.push({ points, active })
    }
  }
  return result
})

type NodeState = 'active' | 'selectable' | 'locked' | 'blocked'

function nodeState(node: AtreeNode): NodeState {
  const v = store.atreeValidation
  if (store.isAtreeActive(node.ability.id))
    return 'active'
  if (node.ability.blockers.some((b: number) => v.reachable.has(b)))
    return 'blocked'
  if (node.parents.length === 0 || (node.parents as AtreeNode[]).some(p => v.reachable.has(p.ability.id)))
    return 'selectable'
  return 'locked'
}

const apOverCap = computed(() =>
  store.atreeValidation.apTotal > store.atreeValidation.apCap,
)
</script>

<template>
  <div class="atree-wrap">
    <!-- Header -->
    <div class="atree-header">
      <span class="atree-ap" :class="{ 'atree-ap--over': apOverCap }">
        AP {{ store.atreeValidation.apTotal }} / {{ store.atreeValidation.apCap }}
      </span>
      <ul v-if="store.atreeValidation.errors.length" class="atree-errors">
        <li v-for="(err, i) in store.atreeValidation.errors" :key="i" class="atree-error-item">
          {{ err }}
        </li>
      </ul>
    </div>

    <!-- Scrollable canvas -->
    <div class="atree-scroll">
      <div
        class="atree-grid"
        :style="{ width: `${gridWidth}px`, height: `${gridHeight}px` }"
      >
        <!-- SVG connector overlay (behind nodes) -->
        <svg
          class="atree-svg"
          :width="gridWidth"
          :height="gridHeight"
          :viewBox="`0 0 ${gridWidth} ${gridHeight}`"
          aria-hidden="true"
        >
          <polyline
            v-for="(conn, i) in connectors"
            :key="i"
            :points="conn.points"
            fill="none"
            :class="conn.active ? 'conn-active' : 'conn-faint'"
          />
        </svg>

        <!-- Nodes -->
        <button
          v-for="node in store.atreeNodes"
          :key="node.ability.id"
          class="atree-node"
          :class="`atree-node--${nodeState(node)}`"
          :style="{
            left: `${node.ability.display.col * CELL}px`,
            top: `${node.ability.display.row * CELL}px`,
          }"
          :title="`${node.ability.display_name} (${node.ability.cost} AP)`"
          :aria-pressed="store.isAtreeActive(node.ability.id)"
          :aria-label="`${node.ability.display_name}, ${node.ability.cost} AP, ${nodeState(node)}`"
          @click="store.toggleAtreeNode(node.ability.id)"
        >
          <span class="atree-node-cost">{{ node.ability.cost }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.atree-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Header */
.atree-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.atree-ap {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  letter-spacing: 0.04em;
}

.atree-ap--over {
  color: var(--color-copper);
}

.atree-errors {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.atree-error-item {
  font-size: 11px;
  color: oklch(60% 0.15 22);
  font-family: 'Geist Mono', 'Courier New', monospace;
}

/* Scrollable wrapper */
.atree-scroll {
  max-height: 60vh;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
}

/* Grid container */
.atree-grid {
  position: relative;
  flex-shrink: 0;
}

/* SVG overlay */
.atree-svg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.conn-faint {
  stroke: var(--color-faint);
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.conn-active {
  stroke: var(--color-copper);
  stroke-width: 2;
  stroke-linejoin: round;
  opacity: 0.8;
}

/* Node buttons */
.atree-node {
  position: absolute;
  width: 36px;
  height: 36px;
  margin: 4px;
  border-radius: 4px;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 600;
  z-index: 1;
  transition:
    opacity 0.1s,
    border-color 0.1s,
    background 0.1s;
}

/* Active: copper fill */
.atree-node--active {
  background: var(--color-copper);
  border-color: var(--color-copper);
  color: oklch(14% 0.008 250);
}

/* Selectable: copper outline */
.atree-node--selectable {
  background: transparent;
  border-color: var(--color-copper);
  color: var(--color-copper);
}

.atree-node--selectable:hover {
  background: oklch(62% 0.11 42 / 0.15);
}

/* Locked: faint/dim */
.atree-node--locked {
  background: transparent;
  border-color: var(--color-faint);
  color: var(--color-faint);
  opacity: 0.5;
  cursor: not-allowed;
}

/* Blocked: red-ish */
.atree-node--blocked {
  background: transparent;
  border-color: oklch(55% 0.15 22);
  color: oklch(60% 0.15 22);
  cursor: not-allowed;
}

.atree-node--active:hover {
  opacity: 0.85;
}
</style>
