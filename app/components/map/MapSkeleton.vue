<script setup lang="ts">
defineProps<{
  steps?: { id: string, label: string, done: boolean }[]
}>()

// Main Wynncraft continent bounds (excluding void dimension)
// Projection matches worldToLatLng: lat = -z, so negative Z (north) sits at the top of screen
const X_MIN = -2200
const X_MAX = 1500
const Z_MIN = -6090 // northernmost edge (top of screen)
const Z_MAX = -350 // southernmost edge (bottom of screen)

function toScreenX(x: number) {
  return ((x - X_MIN) / (X_MAX - X_MIN)) * 100
}

function toScreenY(z: number) {
  return ((-Z_MIN + z) / (-Z_MIN + Z_MAX)) * 100
}

// Axis reference lines at clean world coordinates
const xAxisLabels = [-2000, -1000, 0, 1000].map(x => ({ sx: toScreenX(x), value: x }))
const zAxisLabels = [-5500, -4500, -3500, -2500, -1500].map(z => ({
  sy: toScreenY(z),
  value: z,
}))

// Major cities from place_mapfeatures.json (categoryId: city or town-or-place)
// Spread across the full map extent for good spatial coverage
const zones = [
  { name: 'Olux', x: -1727, z: -5532 }, // dark swamp city, top-left
  { name: 'Llevigar', x: -1989, z: -4533 }, // Gavel port city, left
  { name: 'Cinfras', x: -455, z: -4928 }, // Gavel capital, top-center
  { name: 'Rodoroc', x: 1101, z: -5136 }, // dwarven city, top-right
  { name: 'Corkus City', x: -1632, z: -2930 }, // island city, center-left
  { name: 'Legendary Island', x: -1112, z: -2430 }, // mid-game landmark, center
  { name: 'Selchar', x: 92, z: -3183 }, // island paradise, center-right
  { name: 'Ragni', x: -819, z: -1581 }, // starting city, lower-left
  { name: 'Almuj', x: 970, z: -1983 }, // desert city, lower-right
  { name: 'Detlas', x: 477, z: -1590 }, // central hub, lower-center
].map(c => ({ name: c.name, sx: toScreenX(c.x), sy: toScreenY(c.z) }))
</script>

<template>
  <div
    class="absolute inset-0 z-[700] overflow-hidden bg-bg"
    role="status"
    aria-label="Loading map"
  >
    <!-- Full-bleed grid + axis labels + zone markers -->
    <svg class="absolute inset-0 h-full w-full" aria-hidden="true">
      <!-- Horizontal grid lines -->
      <line
        v-for="i in 12"
        :key="`h${i}`"
        pathLength="1"
        class="grid-line"
        :style="`--d: ${Math.abs(i - 6.5) * 0.045}s`"
        x1="0"
        :y1="`${(i / 13) * 100}%`"
        x2="100%"
        :y2="`${(i / 13) * 100}%`"
      />
      <!-- Vertical grid lines -->
      <line
        v-for="i in 12"
        :key="`v${i}`"
        pathLength="1"
        class="grid-line"
        :style="`--d: ${Math.abs(i - 6.5) * 0.045 + 0.05}s`"
        :x1="`${(i / 13) * 100}%`"
        y1="0"
        :x2="`${(i / 13) * 100}%`"
        y2="100%"
      />

      <!-- X axis labels at their real world X coordinates -->
      <text
        v-for="(label, i) in xAxisLabels"
        :key="`xl-${i}`"
        :x="`${label.sx}%`"
        y="13"
        class="axis-label"
        :style="`--d: ${0.18 + i * 0.055}s`"
        text-anchor="middle"
      >
        X {{ label.value }}
      </text>

      <!-- Z axis labels at their real world Z coordinates -->
      <text
        v-for="(label, i) in zAxisLabels"
        :key="`zl-${i}`"
        x="7"
        :y="`${label.sy}%`"
        class="axis-label"
        :style="`--d: ${0.18 + i * 0.055}s`"
        dominant-baseline="middle"
      >
        Z {{ label.value }}
      </text>

      <!-- Zone markers at real Wynncraft world coordinates -->
      <g
        v-for="(zone, i) in zones"
        :key="zone.name"
        class="zone-marker"
        :style="`--d: ${0.75 + i * 0.09}s`"
      >
        <circle :cx="`${zone.sx}%`" :cy="`${zone.sy}%`" r="2" class="zone-dot" />
        <text
          :x="`${zone.sx}%`"
          :y="`${zone.sy}%`"
          dy="-10"
          class="zone-label"
          text-anchor="middle"
        >
          {{ zone.name.toUpperCase() }}
        </text>
      </g>
    </svg>

    <!-- Compass rose: fixed 180×180, centered on the crest -->
    <svg
      class="compass absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      width="180"
      height="180"
      viewBox="-90 -90 180 180"
      aria-hidden="true"
    >
      <!-- Cardinal arms (N S E W) -->
      <line
        pathLength="1"
        class="compass-arm compass-cardinal"
        style="--d: 0s"
        x1="0"
        y1="0"
        x2="0"
        y2="-76"
      />
      <line
        pathLength="1"
        class="compass-arm compass-cardinal"
        style="--d: 0.04s"
        x1="0"
        y1="0"
        x2="0"
        y2="76"
      />
      <line
        pathLength="1"
        class="compass-arm compass-cardinal"
        style="--d: 0.08s"
        x1="0"
        y1="0"
        x2="76"
        y2="0"
      />
      <line
        pathLength="1"
        class="compass-arm compass-cardinal"
        style="--d: 0.12s"
        x1="0"
        y1="0"
        x2="-76"
        y2="0"
      />
      <!-- Ordinal arms (NE NW SE SW) -->
      <line
        pathLength="1"
        class="compass-arm compass-ordinal"
        style="--d: 0.16s"
        x1="0"
        y1="0"
        x2="40"
        y2="-40"
      />
      <line
        pathLength="1"
        class="compass-arm compass-ordinal"
        style="--d: 0.2s"
        x1="0"
        y1="0"
        x2="-40"
        y2="-40"
      />
      <line
        pathLength="1"
        class="compass-arm compass-ordinal"
        style="--d: 0.24s"
        x1="0"
        y1="0"
        x2="40"
        y2="40"
      />
      <line
        pathLength="1"
        class="compass-arm compass-ordinal"
        style="--d: 0.28s"
        x1="0"
        y1="0"
        x2="-40"
        y2="40"
      />
      <!-- Cardinal direction labels -->
      <text class="dir-label" style="--d: 0.48s" x="0" y="-82" text-anchor="middle">N</text>
      <text
        class="dir-label"
        style="--d: 0.52s"
        x="0"
        y="90"
        text-anchor="middle"
        dominant-baseline="hanging"
      >
        S
      </text>
      <text class="dir-label" style="--d: 0.56s" x="82" y="0" dominant-baseline="middle">E</text>
      <text
        class="dir-label"
        style="--d: 0.6s"
        x="-82"
        y="0"
        text-anchor="end"
        dominant-baseline="middle"
      >
        W
      </text>
    </svg>

    <!-- Icon + status label + step indicators -->
    <div class="pointer-events-none relative z-10 flex select-none flex-col items-center gap-4">
      <svg
        class="crest"
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="28" stroke="oklch(62% 0.11 42 / 0.35)" stroke-width="1.5" />
        <circle cx="32" cy="32" r="20" stroke="oklch(62% 0.11 42 / 0.2)" stroke-width="1" />
        <!-- Compass arms -->
        <line x1="32" y1="8" x2="32" y2="56" stroke="oklch(62% 0.11 42 / 0.15)" stroke-width="0.75" />
        <line x1="8" y1="32" x2="56" y2="32" stroke="oklch(62% 0.11 42 / 0.15)" stroke-width="0.75" />
        <!-- North pointer -->
        <polygon points="32,12 29,26 32,23 35,26" fill="oklch(62% 0.11 42 / 0.9)" />
        <!-- South pointer -->
        <polygon points="32,52 29,38 32,41 35,38" fill="oklch(62% 0.11 42 / 0.3)" />
        <!-- Center dot -->
        <circle cx="32" cy="32" r="3" fill="oklch(62% 0.11 42)" />
        <!-- N label -->
        <text x="32" y="10" text-anchor="middle" dominant-baseline="auto" font-size="6" font-weight="700" letter-spacing="0.1em" fill="oklch(62% 0.11 42 / 0.7)">N</text>
      </svg>
      <p class="label text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-muted">
        Loading map data
      </p>
      <div v-if="steps?.length" class="steps label" aria-hidden="true">
        <div v-for="step in steps" :key="step.id" class="step" :class="{ 'step-done': step.done }">
          <span class="step-dot" />
          {{ step.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Grid ── */
.grid-line {
  stroke: oklch(62% 0.11 42 / 0.1);
  stroke-width: 0.5;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: line-draw 0.55s cubic-bezier(0.16, 1, 0.3, 1) var(--d, 0s) forwards;
}

/* ── Axis labels ── */
.axis-label {
  fill: oklch(62% 0.11 42 / 0.28);
  font-size: 7.5px;
  font-weight: 600;
  letter-spacing: 0.07em;
  opacity: 0;
  animation: fade-in 0.5s ease-out var(--d, 0.2s) forwards;
}

/* ── Zone markers ── */
.zone-marker {
  opacity: 0;
  animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) var(--d, 0.75s) forwards;
}
.zone-dot {
  fill: oklch(62% 0.11 42 / 0.55);
}
.zone-label {
  fill: oklch(62% 0.11 42 / 0.5);
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

/* ── Compass rose ── */
.compass-arm {
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: line-draw 0.4s cubic-bezier(0.16, 1, 0.3, 1) calc(0.55s + var(--d, 0s)) forwards;
}
.compass-cardinal {
  stroke: oklch(62% 0.11 42 / 0.22);
  stroke-width: 0.75;
}
.compass-ordinal {
  stroke: oklch(62% 0.11 42 / 0.1);
  stroke-width: 0.5;
}
.dir-label {
  fill: oklch(62% 0.11 42 / 0.4);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.18em;
  opacity: 0;
  animation: fade-in 0.35s ease-out calc(0.55s + var(--d, 0.48s)) forwards;
}

/* ── Crest ── */
.crest {
  animation:
    crest-in 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both,
    crest-glow 2.8s ease-in-out 1.1s infinite;
}

/* ── Status label ── */
.label {
  animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.65s both;
}

/* ── Keyframes ── */
@keyframes line-draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes crest-in {
  from {
    opacity: 0;
    transform: scale(0.82);
    filter: drop-shadow(0 0 0px oklch(62% 0.11 42 / 0));
  }
  to {
    opacity: 1;
    transform: scale(1);
    filter: drop-shadow(0 6px 28px oklch(62% 0.11 42 / 0.22));
  }
}
@keyframes crest-glow {
  0%,
  100% {
    filter: drop-shadow(0 6px 28px oklch(62% 0.11 42 / 0.15));
  }
  50% {
    filter: drop-shadow(0 6px 44px oklch(62% 0.11 42 / 0.5));
  }
}

/* ── Step indicators ── */
.steps {
  display: flex;
  gap: 18px;
  margin-top: -4px;
}
.step {
  display: flex;
  align-items: center;
  gap: 5px;
  color: oklch(62% 0.11 42 / 0.25);
  transition:
    color 0.35s ease,
    opacity 0.35s ease;
}
.step-done {
  color: oklch(62% 0.11 42 / 0.65);
}
.step-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  transition: box-shadow 0.35s ease;
}
.step-done .step-dot {
  box-shadow: 0 0 6px oklch(62% 0.11 42 / 0.6);
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .grid-line {
    animation: none;
    stroke-dashoffset: 0;
  }
  .axis-label {
    animation: none;
    opacity: 1;
  }
  .zone-marker {
    animation: none;
    opacity: 1;
  }
  .compass-arm {
    animation: none;
    stroke-dashoffset: 0;
  }
  .dir-label {
    animation: none;
    opacity: 1;
  }
  .crest {
    animation: none;
    opacity: 1;
    filter: drop-shadow(0 6px 28px oklch(62% 0.11 42 / 0.25));
  }
  .label {
    animation: none;
    opacity: 1;
  }
}
</style>
