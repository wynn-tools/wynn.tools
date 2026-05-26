<script setup lang="ts">
import type { AtreeNode } from '~/lib/types/atree'
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'
import { computed } from 'vue'
import { computeAtreeConnectors, connectorTileName, nodeImageUrl } from '~/lib/atree/connectors'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const CELL = 44 // px

function archetypeLine(node: AtreeNode): string | null {
  const { archetype, archetype_req: req, req_archetype: reqArch } = node.ability
  if (req && req > 0)
    return `Requires ${req} ${reqArch || archetype || 'archetype'} ${req === 1 ? 'node' : 'nodes'}`
  if (archetype)
    return `Archetype: ${archetype}`
  return null
}

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

interface ConnectorTile {
  row: number
  col: number
  name: string
}

const connectors = computed<ConnectorTile[]>(() => {
  const result: ConnectorTile[] = []
  for (const [key, dirs] of computeAtreeConnectors(store.atreeNodes)) {
    const [rowStr, colStr] = key.split(',')
    result.push({
      row: Number(rowStr),
      col: Number(colStr),
      name: connectorTileName(dirs),
    })
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

const NODE_STATE_CLASSES: Record<NodeState, string> = {
  active: 'opacity-100 cursor-pointer hover:brightness-[1.15]',
  selectable: 'opacity-100 cursor-pointer hover:brightness-[1.15]',
  locked: 'opacity-45 cursor-not-allowed [filter:grayscale(0.7)_brightness(0.5)]',
  blocked: 'opacity-45 cursor-not-allowed [filter:grayscale(0.7)_brightness(0.5)_sepia(0.5)_hue-rotate(310deg)]',
}

function onNodeClick(id: number, e: MouseEvent) {
  if (e.shiftKey)
    store.unlockAtreeNode(id)
  else
    store.toggleAtreeNode(id)
}
</script>

<template>
  <TooltipProvider :delay-duration="120" :skip-delay-duration="300">
    <div class="flex flex-col gap-3">
      <!-- Header -->
      <div class="flex flex-col gap-1.5">
        <span
          class="font-mono text-[13px] font-medium tracking-[0.04em]"
          :class="apOverCap ? 'text-copper' : 'text-text'"
        >
          AP {{ store.atreeValidation.apTotal }} / {{ store.atreeValidation.apCap }}
        </span>
        <ul v-if="store.atreeValidation.errors.length" class="flex list-none flex-col gap-0.5">
          <li
            v-for="(err, i) in store.atreeValidation.errors"
            :key="i"
            class="font-mono text-[11px] text-[oklch(60%_0.15_22)]"
          >
            {{ err }}
          </li>
        </ul>
        <p v-if="store.atreeMessage" class="font-mono text-[11px] tracking-[0.03em] text-copper">
          {{ store.atreeMessage }}
        </p>
      </div>

      <!-- Scrollable canvas -->
      <div class="max-h-[60vh] overflow-auto rounded border border-border bg-bg">
        <div
          class="relative shrink-0"
          :style="{ width: `${gridWidth}px`, height: `${gridHeight}px` }"
        >
          <!-- Connector tile images (behind nodes) -->
          <img
            v-for="(conn, i) in connectors"
            :key="i"
            :src="`https://cdn.wynncraft.com/nextgen/abilities/2.1/connectors/grid/${conn.name}.png`"
            class="pointer-events-none absolute z-0 [image-rendering:pixelated]"
            :style="{
              left: `${conn.col * CELL}px`,
              top: `${conn.row * CELL}px`,
              width: `${CELL}px`,
              height: `${CELL}px`,
            }"
            draggable="false"
            aria-hidden="true"
            alt=""
          >

          <!-- Nodes -->
          <TooltipRoot
            v-for="node in store.atreeNodes"
            :key="node.ability.id"
          >
            <TooltipTrigger as-child>
              <button
                class="group absolute z-[1] flex size-11 items-center justify-center border-0 bg-transparent p-0 transition-[filter,opacity] duration-100"
                :class="NODE_STATE_CLASSES[nodeState(node)]"
                :style="{
                  left: `${node.ability.display.col * CELL}px`,
                  top: `${node.ability.display.row * CELL}px`,
                }"
                :aria-pressed="store.isAtreeActive(node.ability.id)"
                :aria-label="`${node.ability.display_name}, ${node.ability.cost} AP, ${nodeState(node)}`"
                @click="onNodeClick(node.ability.id, $event)"
              >
                <!-- Active art sits underneath, hidden at rest; pulse overlays it
                     and crossfades out on hover (or when selected). -->
                <img
                  :src="nodeImageUrl(node.ability.display.icon, 'active')"
                  :width="CELL"
                  :height="CELL"
                  draggable="false"
                  aria-hidden="true"
                  alt=""
                  class="absolute inset-0 block size-11 [image-rendering:pixelated] transition-opacity duration-[400ms]"
                  :class="store.isAtreeActive(node.ability.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                >
                <img
                  :src="nodeImageUrl(node.ability.display.icon, 'pulse')"
                  :width="CELL"
                  :height="CELL"
                  draggable="false"
                  aria-hidden="true"
                  alt=""
                  class="absolute inset-0 block size-11 [image-rendering:pixelated] transition-opacity duration-[400ms]"
                  :class="store.isAtreeActive(node.ability.id) ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'"
                >
              </button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent
                class="z-[1000] max-w-[280px] rounded-md border border-border bg-bg px-3 py-2.5 font-mono shadow-[0_6px_24px_oklch(0%_0_0_/_0.35)]"
                :side-offset="6"
                :collision-padding="8"
              >
                <div class="mb-1 flex items-baseline justify-between gap-3">
                  <span class="text-xs font-semibold text-text">{{ node.ability.display_name }}</span>
                  <span class="whitespace-nowrap text-[11px] text-copper">{{ node.ability.cost }} AP</span>
                </div>
                <p v-if="archetypeLine(node)" class="mb-1.5 text-[10px] uppercase tracking-[0.04em] text-muted">
                  {{ archetypeLine(node) }}
                </p>
                <!-- desc is trusted game data from the CDN and contains markup -->
                <!-- eslint-disable-next-line vue/no-v-html -->
                <p v-if="node.ability.desc" class="whitespace-pre-line text-[11px] leading-[1.5] text-text" v-html="node.ability.desc" />
              </TooltipContent>
            </TooltipPortal>
          </TooltipRoot>
        </div>
      </div>
    </div>
  </TooltipProvider>
</template>
