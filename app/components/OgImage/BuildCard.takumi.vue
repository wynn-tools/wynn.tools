<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    level?: number
    className?: string
    items?: Array<{ slot: string, name: string, tier?: string | null, icon?: string | null, powders?: string }>
    dps?: number
    ehp?: number
  }>(),
  {
    level: 106,
    className: 'Mage',
    items: () => [
      { slot: 'Weapon', name: 'Fatal', tier: 'Mythic', icon: 'https://cdn.wynn.tools/nextgen/itemguide/3.3/fatal.png', powders: 'TTT' },
      { slot: 'Helmet', name: 'Morph-Stardust', tier: 'Fabled', icon: null },
      { slot: 'Chestplate', name: 'Aphotic', tier: 'Legendary', icon: null, powders: 'WWW' },
      { slot: 'Leggings', name: 'Boreal', tier: 'Rare', icon: null },
      { slot: 'Boots', name: 'Resurgence', tier: 'Mythic', icon: null },
      { slot: 'Ring 1', name: 'Diamond Hydro Ring', tier: 'Unique', icon: null },
      { slot: 'Ring 2', name: 'Moon Pool Circlet', tier: 'Legendary', icon: null },
      { slot: 'Bracelet', name: 'Prowess', tier: 'Rare', icon: null },
      { slot: 'Necklace', name: 'Aquamarine', tier: 'Set', icon: null },
    ],
    dps: 1840,
    ehp: 38210,
  },
)

function formatStat(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// Cool-graphite + blue chrome (sRGB; Satori's CSS subset can't parse oklch()).
const C = {
  bg: '#0e1117', // page ground, cool near-black
  panel: '#141821', // inner tooltip panel
  text: '#eceef2',
  muted: '#9aa0ad',
  faint: '#646c7a',
  seam: '#272d39',
  accent: '#4a9bf5', // cool blue
}

// Canonical in-game rarity name colours (mythic brightened for dark legibility).
const RARITY: Record<string, string> = {
  Normal: '#ffffff',
  Unique: '#ffff55',
  Rare: '#ff55ff',
  Legendary: '#55ffff',
  Fabled: '#ff5555',
  Mythic: '#d6279c',
  Set: '#55ff55',
  Crafted: '#00bcd4',
}
const RARITY_RANK: Record<string, number> = {
  Normal: 0,
  Crafted: 1,
  Set: 1,
  Unique: 2,
  Rare: 3,
  Legendary: 4,
  Fabled: 5,
  Mythic: 6,
}

// Per-class headline colour, echoing the in-builder class theming.
const CLASS_COLOR: Record<string, string> = {
  Warrior: '#f0584f',
  Mage: '#5aa9f0',
  Archer: '#5fcf7a',
  Assassin: '#f0c24a',
  Shaman: '#b07ff0',
}

const headColor = computed(() => CLASS_COLOR[props.className] ?? C.accent)

// Pixel font first (registered via @nuxt/fonts as WynncraftOg), display fallback.
const PIXEL = '\'WynncraftOg\', \'Barlow Semi Condensed\', sans-serif'
const SANS = '\'Geist Mono\', monospace'

function rarityColor(tier?: string | null): string {
  if (!tier)
    return C.faint
  return RARITY[tier] ?? C.text
}

const realItems = computed(() => props.items.filter(i => i.name !== '—'))

const bestRarity = computed(() => {
  let best: string | null = null
  let rank = -1
  for (const it of realItems.value) {
    if (!it.tier || it.tier === 'Crafted')
      continue
    const r = RARITY_RANK[it.tier] ?? 0
    if (r > rank) {
      rank = r
      best = it.tier
    }
  }
  return best
})

const itemColumns = computed(() => {
  const list = realItems.value
  const half = Math.ceil(list.length / 2)
  return [list.slice(0, half), list.slice(half)]
})
</script>

<template>
  <div
    :style="{
      display: 'flex',
      width: '100%',
      height: '100%',
      background: C.bg,
      padding: '24px',
      boxSizing: 'border-box',
      fontFamily: SANS,
    }"
  >
    <!-- Tooltip panel: dark inset with a class-coloured frame edge -->
    <div
      :style="{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: C.panel,
        border: `2px solid ${headColor}`,
        borderRadius: '10px',
        padding: '28px 44px',
        boxSizing: 'border-box',
        color: C.text,
      }"
    >
      <!-- Header: class name + tags on the left, wynn.tools mark on the right -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; flex-direction: column;">
          <span
            :style="{
              fontFamily: PIXEL,
              fontSize: '58px',
              lineHeight: 1,
              letterSpacing: '-1px',
              color: headColor,
              textShadow: '3px 3px 0 rgba(0,0,0,0.45)',
            }"
          >{{ props.className }}</span>

          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <span
              :style="{
                display: 'flex',
                fontFamily: PIXEL,
                fontSize: '22px',
                lineHeight: 1,
                color: '#0c0e12',
                background: headColor,
                padding: '5px 10px',
                borderRadius: '3px',
              }"
            >lv {{ props.level }}</span>
            <span
              v-if="bestRarity"
              :style="{
                display: 'flex',
                fontFamily: PIXEL,
                fontSize: '22px',
                lineHeight: 1,
                color: '#0c0e12',
                background: rarityColor(bestRarity),
                padding: '5px 10px',
                borderRadius: '3px',
              }"
            >{{ bestRarity.toLowerCase() }}</span>
          </div>
        </div>

        <div
          :style="{
            display: 'flex',
            alignItems: 'center',
            fontFamily: SANS,
            fontSize: '15px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: C.text,
          }"
        >
          <div :style="{ display: 'flex', width: '9px', height: '9px', background: C.accent, borderRadius: '9999px', marginRight: '11px' }" />
          <span>wynn.tools</span>
        </div>
      </div>

      <!-- Divider -->
      <div :style="{ display: 'flex', height: '2px', background: C.seam, marginTop: '18px' }" />

      <!-- Body: two item columns, rarity-tinted names -->
      <div style="display: flex; flex: 1; margin-top: 14px;">
        <div
          v-for="(column, colIdx) in itemColumns"
          :key="colIdx"
          :style="{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingLeft: colIdx === 0 ? '0' : '36px',
            paddingRight: colIdx === 0 ? '36px' : '0',
            borderLeft: colIdx === 1 ? `1px solid ${C.seam}` : 'none',
          }"
        >
          <div
            v-for="(item, rowIdx) in column"
            :key="item.slot"
            :style="{
              display: 'flex',
              alignItems: 'baseline',
              paddingTop: rowIdx === 0 ? '0' : '9px',
            }"
          >
            <span
              :style="{
                display: 'flex',
                fontFamily: SANS,
                fontSize: '12px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: C.faint,
                width: '96px',
              }"
            >{{ item.slot }}</span>
            <span style="display: flex; flex: 1; align-items: center; min-width: 0;">
              <img
                v-if="item.icon"
                :src="item.icon"
                width="26"
                height="26"
                :style="{ marginRight: '9px', objectFit: 'contain' }"
                alt=""
              >
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '22px',
                  lineHeight: 1.1,
                  letterSpacing: '-0.5px',
                  color: rarityColor(item.tier),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }"
              >{{ item.name }}</span>
              <span
                v-if="item.powders"
                :style="{
                  display: 'flex',
                  fontFamily: SANS,
                  fontSize: '13px',
                  color: C.faint,
                  marginLeft: '10px',
                }"
              >[{{ item.powders }}]</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Footer: Effective HP leads (universal); Melee DPS de-emphasized,
           since DPS is melee-only and misleads spell builds. -->
      <div :style="{ display: 'flex', alignItems: 'flex-end', marginTop: '16px', paddingTop: '16px', borderTop: `2px solid ${C.seam}` }">
        <div style="display: flex; align-items: baseline; flex: 1;">
          <div :style="{ display: 'flex', width: '11px', height: '11px', background: C.accent, marginRight: '15px', transform: 'rotate(45deg)' }" />
          <span :style="{ display: 'flex', fontFamily: SANS, fontSize: '15px', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, marginRight: '16px' }">Effective HP</span>
          <span :style="{ display: 'flex', fontFamily: PIXEL, fontSize: '40px', lineHeight: 1, color: C.text }">{{ formatStat(props.ehp) }}</span>
        </div>
        <div style="display: flex; align-items: baseline;">
          <span :style="{ display: 'flex', fontFamily: SANS, fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginRight: '12px' }">Melee DPS</span>
          <span :style="{ display: 'flex', fontFamily: SANS, fontSize: '22px', lineHeight: 1, color: C.muted }">{{ formatStat(props.dps) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
