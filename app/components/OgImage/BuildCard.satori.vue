<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  level: number
  className: string
  items: Array<{ slot: string, name: string, powders?: string }>
  dps: number
  ehp: number
}>()

function formatStat(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const itemColumns = computed(() => {
  const half = Math.ceil(props.items.length / 2)
  return [props.items.slice(0, half), props.items.slice(half)]
})

// Forge palette — sRGB equivalents of the OKLCH tokens in DESIGN.md.
// Satori's CSS subset doesn't reliably parse oklch(), so hex is the safe form here.
const bg = '#16110f' // Carbon Hearth
const text = '#ebe7e4' // Off-White Steel
const mist = '#8e8783' // Steel Mist
const ash = '#4a423d' // Ash
const seam = '#322d2a' // Forge Seam
const copper = '#d27a3a' // Forge Copper
</script>

<template>
  <div
    :style="{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      background: bg,
      color: text,
      padding: '52px 64px',
      fontFamily: '\'Figtree\', sans-serif',
      boxSizing: 'border-box',
    }"
  >
    <!-- Headline row: class name + level on the left, wynn.tools marker on the right -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="display: flex; align-items: baseline;">
        <span
          :style="{
            fontFamily: '\'Barlow Semi Condensed\', sans-serif',
            fontWeight: 800,
            fontSize: '104px',
            lineHeight: 1,
            letterSpacing: '-0.035em',
            color: text,
          }"
        >{{ props.className }}</span>
        <span
          :style="{
            fontFamily: '\'Geist Mono\', monospace',
            fontSize: '18px',
            fontWeight: 500,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: mist,
            marginLeft: '26px',
            paddingBottom: '8px',
          }"
        >Lv {{ props.level }}</span>
      </div>
      <div
        :style="{
          display: 'flex',
          alignItems: 'center',
          fontFamily: '\'Geist Mono\', monospace',
          fontSize: '14px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: text,
          paddingTop: '14px',
        }"
      >
        <div :style="{ width: '8px', height: '8px', background: copper, borderRadius: '9999px', marginRight: '12px' }" />
        <span>wynn.tools</span>
      </div>
    </div>

    <!-- Hairline -->
    <div :style="{ display: 'flex', height: '1px', background: seam, marginTop: '32px' }" />

    <!-- Body: two item columns on the left, stats on the right -->
    <div style="display: flex; flex: 1; margin-top: 26px;">
      <!-- Items ledger: 2 columns -->
      <div style="display: flex; flex: 1;">
        <div
          v-for="(column, colIdx) in itemColumns"
          :key="colIdx"
          :style="{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingLeft: colIdx === 0 ? '0' : '32px',
            paddingRight: colIdx === itemColumns.length - 1 ? '0' : '32px',
          }"
        >
          <div
            v-for="(item, rowIdx) in column"
            :key="item.slot"
            :style="{
              display: 'flex',
              alignItems: 'baseline',
              paddingTop: rowIdx === 0 ? '0' : '12px',
            }"
          >
            <span
              :style="{
                fontFamily: '\'Geist Mono\', monospace',
                fontSize: '12px',
                fontWeight: 500,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: ash,
                width: '110px',
              }"
            >{{ item.slot }}</span>
            <span
              :style="{
                display: 'flex',
                flex: 1,
                alignItems: 'baseline',
                minWidth: 0,
              }"
            >
              <span
                :style="{
                  fontFamily: '\'Figtree\', sans-serif',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }"
              >{{ item.name }}</span>
              <span
                v-if="item.powders"
                :style="{
                  fontFamily: '\'Geist Mono\', monospace',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: mist,
                  marginLeft: '10px',
                }"
              >[{{ item.powders }}]</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Vertical seam -->
      <div :style="{ display: 'flex', width: '1px', background: seam, margin: '0 40px' }" />

      <!-- Stats column -->
      <div style="display: flex; flex-direction: column; width: 260px;">
        <div style="display: flex; flex-direction: column;">
          <span
            :style="{
              fontFamily: '\'Geist Mono\', monospace',
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: mist,
            }"
          >Damage / s</span>
          <span
            :style="{
              fontFamily: '\'Barlow Semi Condensed\', sans-serif',
              fontWeight: 800,
              fontSize: '54px',
              lineHeight: 1,
              letterSpacing: '-0.025em',
              color: text,
              marginTop: '10px',
            }"
          >{{ formatStat(props.dps) }}</span>
        </div>
        <div style="display: flex; flex-direction: column; margin-top: 36px;">
          <span
            :style="{
              fontFamily: '\'Geist Mono\', monospace',
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: mist,
            }"
          >Effective HP</span>
          <span
            :style="{
              fontFamily: '\'Barlow Semi Condensed\', sans-serif',
              fontWeight: 800,
              fontSize: '54px',
              lineHeight: 1,
              letterSpacing: '-0.025em',
              color: text,
              marginTop: '10px',
            }"
          >{{ formatStat(props.ehp) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
