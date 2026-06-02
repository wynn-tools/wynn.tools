<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { AtreeNode, NormalizedText } from '~/lib/types/atree'
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { anyDir, computeAtreeConnectors, connectorTileName, dirsEqual, nodeImageUrl, nodeScale } from '~/lib/atree/connectors'
import { useBuildStore } from '~/stores/build'

const store = useBuildStore()

const CELL = 44 // px

// Wynncraft font name (from the parsed HTML) → self-hosted font-family.
// `common` is the elemental/combat icon font — required to render the PUA
// glyphs (mana/element/heart symbols) embedded in ability descriptions.
const FONT_FAMILY: Record<string, string> = {
  ascii: '\'wynn-ascii\'',
  common: '\'wynn-common\'',
  default: '\'wynn-default\'',
  five: '\'wynn-five\'',
  wynnic: '\'wynn-wynnic\'',
  high_gavelian: '\'wynn-high-gavelian\'',
  old_fruman: '\'wynn-old-fruman\'',
}

/** Inline style for one parsed-HTML description segment. */
function segmentStyle(seg: NormalizedText): CSSProperties {
  return {
    color: seg.color,
    fontFamily: seg.font ? FONT_FAMILY[seg.font] : undefined,
    fontWeight: seg.bold ? 700 : undefined,
    fontStyle: seg.italic ? 'italic' : undefined,
    textDecoration: seg.underline ? 'underline' : undefined,
  }
}

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
  activeName: string | null
}

const connectors = computed<ConnectorTile[]>(() => {
  const activeIds = new Set(
    store.atreeNodes
      .filter(n => store.isAtreeActive(n.ability.id))
      .map(n => n.ability.id),
  )
  const result: ConnectorTile[] = []
  for (const [key, cell] of computeAtreeConnectors(store.atreeNodes, activeIds)) {
    const [rowStr, colStr] = key.split(',')
    const hasActive = anyDir(cell.activeDirs)
    const fullyActive = hasActive && dirsEqual(cell.dirs, cell.activeDirs)
    result.push({
      row: Number(rowStr),
      col: Number(colStr),
      name: fullyActive ? `${connectorTileName(cell.dirs)}_active` : connectorTileName(cell.dirs),
      activeName: hasActive && !fullyActive ? connectorTileName(cell.activeDirs) : null,
    })
  }
  return result
})

type NodeState = 'active' | 'selectable' | 'locked' | 'blocked'

// Single pass over all nodes per validation/active-set change instead of
// O(N²) per render (every node previously called isAtreeActive + Set scans
// on its blockers + parents on each Vue render).
const stateMap = computed(() => {
  const v = store.atreeValidation
  const map = new Map<number, NodeState>()
  for (const node of store.atreeNodes) {
    const id = node.ability.id
    let s: NodeState
    if (store.isAtreeActive(id))
      s = 'active'
    else if (node.ability.blockers.some((b: number) => v.reachable.has(b)))
      s = 'blocked'
    else if (node.parents.length === 0 || (node.parents as AtreeNode[]).some(p => v.reachable.has(p.ability.id)))
      s = 'selectable'
    else
      s = 'locked'
    map.set(id, s)
  }
  return map
})

function nodeState(node: AtreeNode): NodeState {
  return stateMap.value.get(node.ability.id) ?? 'locked'
}

const apOverCap = computed(() =>
  store.atreeValidation.apTotal > store.atreeValidation.apCap,
)

// `node--<state>` drive resting visuals via scoped CSS below. The hover
// brightness for interactive states stays inline for Tailwind ergonomics.
const NODE_STATE_CLASSES: Record<NodeState, string> = {
  active: 'node--active cursor-pointer hover:brightness-[1.15]',
  selectable: 'node--selectable cursor-pointer hover:brightness-[1.15]',
  locked: 'node--locked cursor-not-allowed',
  blocked: 'node--blocked cursor-not-allowed',
}

function onNodeClick(id: number, e: MouseEvent) {
  if (e.shiftKey)
    store.unlockAtreeNode(id)
  else
    store.toggleAtreeNode(id)
}

// Ultimates use the `ultimate*` icon prefix on the CDN and are visually
// larger in-game. Grid math is unchanged — the bigger size is purely a
// CSS transform on the artwork, centered on the original cell.
function isUltimate(node: AtreeNode): boolean {
  const icon = node.ability.display.icon ?? ''
  return icon.startsWith('ultimate') || icon.startsWith('abilityTree.ultimate')
}

// Per-state art selection. The CDN ships three variants per node:
// `base` (disabled / dim), `_pulse` (frontier / ready), `_active` (lit).
// Using the right variant per state replaces the old grayscale/brightness
// CSS hacks with the artwork the designer actually intended.
function restSrc(node: AtreeNode): string {
  const icon = node.ability.display.icon
  const s = nodeState(node)
  if (s === 'active')
    return nodeImageUrl(icon, 'active')
  if (s === 'selectable')
    return nodeImageUrl(icon, 'pulse')
  return nodeImageUrl(icon, 'base')
}

// Hover-state art — only selectable nodes preview the lit state on hover.
function hoverSrc(node: AtreeNode): string | null {
  if (nodeState(node) === 'selectable')
    return nodeImageUrl(node.ability.display.icon, 'active')
  return null
}

// --- Minimap ---
// The tree is taller than the viewport almost always; users complain about
// scroll fatigue and losing orientation. The minimap mirrors node state at
// low scale and acts as a scrubber.
const canvasEl = ref<HTMLElement | null>(null)
const scrollX = ref(0)
const scrollY = ref(0)
const viewW = ref(0)
const viewH = ref(0)

function syncViewport() {
  if (!canvasEl.value)
    return
  scrollX.value = canvasEl.value.scrollLeft
  scrollY.value = canvasEl.value.scrollTop
  viewW.value = canvasEl.value.clientWidth
  viewH.value = canvasEl.value.clientHeight
}

let ro: ResizeObserver | null = null
onMounted(() => {
  syncViewport()
  if (canvasEl.value && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(syncViewport)
    ro.observe(canvasEl.value)
  }
})
onUnmounted(() => ro?.disconnect())

const MINI_MAX_W = 140
const MINI_MAX_H = 180

const miniScale = computed(() => {
  const fullW = cols.value * CELL
  const fullH = rows.value * CELL
  if (!fullW || !fullH)
    return 0
  return Math.min(MINI_MAX_W / fullW, MINI_MAX_H / fullH)
})
const miniW = computed(() => cols.value * CELL * miniScale.value)
const miniH = computed(() => rows.value * CELL * miniScale.value)
const miniViewX = computed(() => scrollX.value * miniScale.value)
const miniViewY = computed(() => scrollY.value * miniScale.value)
const miniViewW = computed(() => Math.min(miniW.value, viewW.value * miniScale.value))
const miniViewH = computed(() => Math.min(miniH.value, viewH.value * miniScale.value))

const overflows = computed(() => {
  if (!viewW.value || !viewH.value)
    return false
  return cols.value * CELL > viewW.value || rows.value * CELL > viewH.value
})

function nodeMiniColor(node: AtreeNode): string {
  const s = nodeState(node)
  if (s === 'active')
    return 'var(--color-accent)' // copper — lit
  if (s === 'selectable')
    return 'var(--color-muted)' // steel mist — reachable
  if (s === 'blocked')
    return 'oklch(50% 0.13 22)' // muted red
  return 'var(--color-border)' // dim — locked
}

function scrollMiniTo(e: MouseEvent) {
  if (!canvasEl.value)
    return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const targetX = x / miniScale.value - viewW.value / 2
  const targetY = y / miniScale.value - viewH.value / 2
  canvasEl.value.scrollTo({
    left: Math.max(0, targetX),
    top: Math.max(0, targetY),
    behavior: 'smooth',
  })
}

let dragging = false
function onMiniPointerDown(e: PointerEvent) {
  dragging = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  scrollMiniTo(e)
}
function onMiniPointerMove(e: PointerEvent) {
  if (dragging)
    scrollMiniTo(e)
}
function onMiniPointerUp(e: PointerEvent) {
  dragging = false
  ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
}

// --- Zoom (touch-friendly) ---
// Touch users can't pinch a fixed-grid scroll container reliably, so expose
// discrete zoom levels. Default is 1; on small viewports we drop to 0.85 so
// the tree fits with one finger-pan rather than two.
const ZOOM_LEVELS = [0.6, 0.75, 0.9, 1, 1.15, 1.3]
// Desktop defaults to 1.0 — pixel art is crispest at integer scale, and a
// ≤9-tile tree has the width to spare. Mobile drops to 0.9 (set on mount).
const zoomIdx = ref(3)
const zoom = computed(() => ZOOM_LEVELS[zoomIdx.value] ?? 1)
const scaledWidth = computed(() => gridWidth.value * zoom.value)
const scaledHeight = computed(() => gridHeight.value * zoom.value)

// The canvas hugs the tree's width (+ scrollbar gutter) so it stops sprawling
// across the section. The minimap sits beside it as a flex sibling, not over it.
const canvasMaxWidth = computed(() => scaledWidth.value + 18)

function zoomIn() {
  if (zoomIdx.value < ZOOM_LEVELS.length - 1)
    zoomIdx.value += 1
}
function zoomOut() {
  if (zoomIdx.value > 0)
    zoomIdx.value -= 1
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches)
    zoomIdx.value = 2 // 0.9× — fits the typical Archer/Mage tree on a phone screen with light panning
})
</script>

<template>
  <TooltipProvider :delay-duration="120" :skip-delay-duration="300">
    <div class="flex flex-col gap-3">
      <!-- Header -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-3">
          <span
            class="flex-1 font-mono text-[13px] font-medium tracking-[0.04em]"
            :class="apOverCap ? 'text-copper' : 'text-text'"
          >
            AP {{ store.atreeValidation.apTotal }} / {{ store.atreeValidation.apCap }}
          </span>
          <!-- Zoom controls: discrete steps. Visible on every screen, but they
               earn their keep on touch where pinch-to-zoom isn't a thing. -->
          <div class="atree-zoom" role="group" aria-label="Ability tree zoom">
            <button
              type="button"
              class="atree-zoom-btn"
              :disabled="zoomIdx === 0"
              aria-label="Zoom out"
              @click="zoomOut"
            >
              −
            </button>
            <span class="atree-zoom-readout" aria-live="polite">{{ Math.round(zoom * 100) }}%</span>
            <button
              type="button"
              class="atree-zoom-btn"
              :disabled="zoomIdx === ZOOM_LEVELS.length - 1"
              aria-label="Zoom in"
              @click="zoomIn"
            >
              +
            </button>
          </div>
        </div>
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

      <!-- Scrollable canvas + minimap shell -->
      <div class="atree-shell">
        <div
          ref="canvasEl"
          class="atree-canvas max-h-[60vh] overflow-auto rounded border border-border"
          :style="{ maxWidth: `${canvasMaxWidth}px` }"
          @scroll.passive="syncViewport"
        >
          <div
            class="atree-zoom-wrap shrink-0"
            :style="{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }"
          >
            <div
              class="atree-grid relative shrink-0"
              :style="{
                width: `${gridWidth}px`,
                height: `${gridHeight}px`,
                transform: `scale(${zoom})`,
                transformOrigin: '0 0',
              }"
            >
              <!-- Connector tile images (behind nodes) -->
              <template v-for="(conn, i) in connectors" :key="i">
                <!-- Base: all directions, no active glow -->
                <img
                  :src="`https://cdn.wynn.tools/nextgen/abilities/2.1/connectors/grid/${conn.name}.png`"
                  class="connector pointer-events-none absolute [image-rendering:pixelated]"
                  :class="conn.name.endsWith('_active') ? 'active-connector' : 'z-0'"
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
                <!-- Active overlay: only the active-path directions lit up -->
                <img
                  v-if="conn.activeName"
                  :src="`https://cdn.wynn.tools/nextgen/abilities/2.1/connectors/grid/${conn.activeName}_active.png`"
                  class="connector active-connector pointer-events-none absolute [image-rendering:pixelated]"
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
              </template>

              <!-- Nodes. v-memo skips the entire per-node subtree on re-renders
                 when this node's state hasn't changed — clicking one node
                 only re-renders nodes whose state actually flipped. -->
              <TooltipRoot
                v-for="node in store.atreeNodes"
                :key="node.ability.id"
                v-memo="[stateMap.get(node.ability.id)]"
              >
                <TooltipTrigger as-child>
                  <button
                    class="group absolute z-[1] flex size-11 items-center justify-center border-0 bg-transparent p-0 transition-[filter,opacity] duration-100"
                    :class="[NODE_STATE_CLASSES[nodeState(node)], { 'node--ultimate': isUltimate(node) }]"
                    :style="{
                      'left': `${node.ability.display.col * CELL}px`,
                      'top': `${node.ability.display.row * CELL}px`,
                      '--node-scale': nodeScale(node.ability.display.icon),
                    }"
                    :aria-pressed="store.isAtreeActive(node.ability.id)"
                    :aria-label="`${node.ability.display_name}, ${node.ability.cost} AP, ${nodeState(node)}`"
                    @click="onNodeClick(node.ability.id, $event)"
                  >
                    <!-- Rest art (state-dependent): base for locked/blocked,
                       pulse for selectable, active for already-selected. -->
                    <img
                      :src="restSrc(node)"
                      :width="CELL"
                      :height="CELL"
                      draggable="false"
                      aria-hidden="true"
                      alt=""
                      class="absolute inset-0 block size-11 [image-rendering:pixelated] transition-opacity duration-[400ms]"
                      :class="hoverSrc(node) ? 'opacity-100 group-hover:opacity-0' : 'opacity-100'"
                    >
                    <!-- Hover preview: only selectable nodes light up to active
                       on hover, previewing the selected state. -->
                    <img
                      v-if="hoverSrc(node)"
                      :src="hoverSrc(node)!"
                      :width="CELL"
                      :height="CELL"
                      draggable="false"
                      aria-hidden="true"
                      alt=""
                      class="absolute inset-0 block size-11 opacity-0 [image-rendering:pixelated] transition-opacity duration-[400ms] group-hover:opacity-100"
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
                    <!-- Rich description: NormalizedText[] segments (live data) render
                     with their parsed color/font/weight; a plain string (historical
                     backfilled data) renders as-is. -->
                    <p
                      v-if="node.ability.desc && node.ability.desc.length"
                      class="whitespace-pre-line text-[11px] leading-[1.5] text-text"
                    >
                      <template v-if="typeof node.ability.desc === 'string'">
                        {{ node.ability.desc }}
                      </template>
                      <template v-else>
                        <span
                          v-for="(seg, i) in node.ability.desc"
                          :key="i"
                          :style="segmentStyle(seg)"
                        >{{ seg.text }}</span>
                      </template>
                    </p>
                  </TooltipContent>
                </TooltipPortal>
              </TooltipRoot>
            </div>
          </div>
        </div>

        <!-- Minimap overlay: only shown when the tree exceeds the viewport. -->
        <div
          v-if="overflows && miniW > 0 && miniH > 0"
          class="atree-minimap"
          :style="{ width: `${miniW}px`, height: `${miniH}px` }"
          role="region"
          aria-label="Ability tree minimap — click or drag to navigate"
          @pointerdown="onMiniPointerDown"
          @pointermove="onMiniPointerMove"
          @pointerup="onMiniPointerUp"
          @pointercancel="onMiniPointerUp"
        >
          <span
            v-for="node in store.atreeNodes"
            :key="node.ability.id"
            class="atree-minimap-dot"
            :class="{ 'atree-minimap-dot--ultimate': isUltimate(node) }"
            :style="{
              left: `${node.ability.display.col * CELL * miniScale}px`,
              top: `${node.ability.display.row * CELL * miniScale}px`,
              background: nodeMiniColor(node),
            }"
          />
          <div
            class="atree-minimap-viewport"
            :style="{
              left: `${miniViewX}px`,
              top: `${miniViewY}px`,
              width: `${miniViewW}px`,
              height: `${miniViewH}px`,
            }"
          />
        </div>
      </div>
    </div>
  </TooltipProvider>
</template>

<style scoped>
/* Lift the canvas above page bg so the pixel-art icons read against
   something other than near-black, and lay a faint copper grid behind
   the tree so empty regions still feel like coordinate space. */
.atree-canvas {
  background-color: var(--color-surface);
  /* Tree hugs the left; the reserved right strip (see canvasMaxWidth) holds the
     floating minimap so it never overlaps nodes. */
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  /* Reserve the scrollbar gutter so the tall tree's scrollbar doesn't shift the
     grid or trigger a phantom horizontal scroll at the width cap. */
  scrollbar-gutter: stable;
}

.atree-grid {
  background-image: radial-gradient(
    circle at 22px 22px,
    color-mix(in oklch, var(--color-accent) 5%, transparent) 1px,
    transparent 1.5px
  );
  background-size: 44px 44px;
}

/* Canvas + minimap sit side by side; the minimap is a sibling, never an
   overlay, so it can't cover the tree's rightmost nodes. */
.atree-shell {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

/* The CDN ships purpose-built art per state (base / pulse / active), so no
   filter is needed for the normal three states — the assets carry it.
   `blocked` still gets a light red tint so a "conflicts with what you've
   chosen" node reads differently from a regular "out of reach" one. */
:deep(.node--blocked) img {
  filter: sepia(0.45) hue-rotate(310deg) saturate(1.1);
}

.atree-grid button img {
  transform: scale(var(--node-scale, 1));
  transform-origin: center;
}

.connector {
  transform: scale(1.2);
  z-index: 1;
}

.active-connector {
  transform: scale(1.2) translateY(-3px);
  z-index: 1;
}

/* Minimap — docks beside the canvas (flex sibling). Stays put while the canvas
   scrolls internally since it lives outside the scroll container. Click or drag
   to scrub. */
.atree-minimap {
  position: sticky;
  top: 10px;
  flex-shrink: 0;
  background: color-mix(in oklch, var(--color-bg) 92%, transparent);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px;
  cursor: crosshair;
  box-shadow: 0 4px 16px oklch(0% 0 0 / 0.35);
  user-select: none;
}

.atree-minimap-dot {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 1px;
  pointer-events: none;
  transform: translate(-1px, -1px);
}
.atree-minimap-dot--ultimate {
  width: 5px;
  height: 5px;
  border-radius: 2px;
  transform: translate(-2px, -2px);
}

.atree-minimap-viewport {
  position: absolute;
  border: 1px solid color-mix(in oklch, var(--color-accent) 85%, transparent);
  background: color-mix(in oklch, var(--color-accent) 10%, transparent);
  border-radius: 2px;
  pointer-events: none;
  transition:
    left 0.08s linear,
    top 0.08s linear;
}

/* Zoom controls — sit beside AP readout. Mono, copper on hover, matching the
   atree node interaction language. */
.atree-zoom {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 2px;
  background: color-mix(in oklch, var(--color-bg) 50%, transparent);
}

.atree-zoom-btn {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-muted);
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.12s,
    background 0.12s;
}
.atree-zoom-btn:hover:not(:disabled) {
  color: var(--color-copper);
  background: color-mix(in oklch, var(--color-accent) 8%, transparent);
}
.atree-zoom-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.atree-zoom-readout {
  font-family: 'Geist Mono', 'Courier New', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--color-faint);
  min-width: 38px;
  text-align: center;
}

@media (max-width: 720px) {
  /* Drop the inner vertical scroll on touch. A 56vh scroll region mid-page
     captures finger-drags, so the user fights to scroll the tree instead of the
     page and can't reach the panels below. Letting the tree flow at full height
     means the page scrolls through it naturally; overflow:auto then only kicks
     in horizontally for trees wider than the phone (one-finger pan). */
  .atree-canvas {
    max-height: none;
  }
  /* Minimap is desktop-only — it's too small to drive on a touchscreen and
     duplicates the function of pan-by-finger that overflow:auto already
     provides for touch. */
  .atree-minimap {
    display: none;
  }
  .atree-zoom-btn {
    width: 34px;
    height: 34px;
    font-size: 18px;
  }
}
</style>
