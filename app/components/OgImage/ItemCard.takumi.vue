<script setup lang="ts">
import { computed } from 'vue'

interface BaseLine {
  iconUrl: string | null
  text: string
}
interface DefLine {
  iconUrl: string
  value: string
}
interface SpCircle {
  skill: string
  active: boolean
  value: number
  discUrl: string
  iconUrl: string
  checkUrl: string
  valueColor: string
}
interface IdRow {
  label: string
  left: string
  right: string
  color: string
}
interface MajorIdMeta {
  name: string
  text: string
}
interface LoreSeg {
  text: string
  color: string
}

const props = withDefaults(
  defineProps<{
    name?: string
    tier?: string
    subType?: string
    isWeapon?: boolean
    combatLevel?: number
    classReq?: string | null
    color?: string
    light?: string
    bg?: string
    icon?: string
    emblem?: string | null
    elementIcons?: string[]
    dps?: number | null
    attackSpeed?: string | null
    hits?: number | null
    damageLines?: BaseLine[]
    health?: number | null
    defenceLines?: DefLine[]
    sp?: SpCircle[]
    idRows?: IdRow[]
    majorIds?: MajorIdMeta[]
    powderSlots?: number
    lore?: LoreSeg[]
  }>(),
  {
    name: 'Item',
    tier: 'Normal',
    subType: '',
    isWeapon: false,
    combatLevel: 0,
    classReq: null,
    color: '#ffffff',
    light: '#cccccc',
    bg: '#303030',
    icon: '',
    emblem: null,
    elementIcons: () => [],
    dps: null,
    attackSpeed: null,
    hits: null,
    damageLines: () => [],
    health: null,
    defenceLines: () => [],
    sp: () => [],
    idRows: () => [],
    majorIds: () => [],
    powderSlots: 0,
    lore: () => [],
  },
)

// Page ground matches the tooltip's #0d0d0d "walled garden".
const C = {
  ground: '#0d0d0d',
  text: '#fcfcfc',
  muted: '#aeaeae',
  faint: '#5c5c5c',
  brand: '#4a9bf5',
}
// nuxt-og-image's build-time font scanner only registers a family it sees as a
// literal fontFamily string value (og-image's RE_JS_FONT_FAMILY) — it cannot
// follow a variable. Declaring the stacks as object literals keeps that literal
// in <script setup> so the OG renderer actually loads WynncraftOg + Geist Mono —
// which must ALSO be declared `global: true` in nuxt.config.
// Double quotes are required: the value itself contains single quotes.
/* eslint-disable style/quotes -- double quotes are load-bearing: single-quoting
   would escape the inner family quotes and break og-image's RE_JS_FONT_FAMILY. */
const PIXEL_STYLE = { fontFamily: "'WynncraftOg', 'Barlow Semi Condensed', sans-serif" }
const SANS_STYLE = { fontFamily: "'Geist Mono', monospace" }
const FIVE_STYLE = { fontFamily: "'WynnFive', 'WynncraftOg', sans-serif" }
/* eslint-enable style/quotes */
const PIXEL = PIXEL_STYLE.fontFamily
const SANS = SANS_STYLE.fontFamily
const FIVE = FIVE_STYLE.fontFamily

// Takumi can't measure text height, so we budget the right column by hand.
const MAX_IDS = 12
const MAX_MAJORS = 2
const MAJOR_TEXT_CAP = 120

// Right-column vertical budget (px) below the header, and rough heights of each
// block, used to give the lore whatever space the IDs + majors leave free.
const RIGHT_COL_HEIGHT = 392
const ID_ROW_H = 22
const MAJOR_BLOCK_H = 70
const LORE_LINE_H = 20
const LORE_CHARS_PER_LINE = 66

const shownIds = computed(() => props.idRows.slice(0, MAX_IDS))
const hiddenIdCount = computed(() =>
  Math.max(0, props.idRows.length - MAX_IDS),
)
const shownMajors = computed(() =>
  props.majorIds.slice(0, MAX_MAJORS).map(m => ({
    name: m.name,
    text:
      m.text.length > MAJOR_TEXT_CAP
        ? `${m.text.slice(0, MAJOR_TEXT_CAP)}…`
        : m.text,
  })),
)
// Lore fills the space the IDs + majors don't, so sparse items show far more of
// it than dense ones (rather than every card cutting at a fixed length).
const loreCap = computed(() => {
  let used = shownIds.value.length * ID_ROW_H
  if (hiddenIdCount.value > 0)
    used += ID_ROW_H
  if (shownMajors.value.length)
    used += 16 + shownMajors.value.length * MAJOR_BLOCK_H
  used += 14 // lore margin-top
  const lines = Math.floor((RIGHT_COL_HEIGHT - used) / LORE_LINE_H)
  return Math.max(0, lines * LORE_CHARS_PER_LINE)
})
const loreText = computed(() => {
  const cap = loreCap.value
  if (cap <= 0)
    return ''
  const joined = props.lore.map(s => s.text).join('')
  return joined.length > cap ? `${joined.slice(0, cap)}…` : joined
})
const panelStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column' as const,
  flex: 1,
  position: 'relative' as const,
  background: `linear-gradient(${C.ground}, ${props.bg})`,
  border: `3px solid ${props.color}`,
  padding: '30px 40px',
  boxSizing: 'border-box' as const,
  color: C.text,
  overflow: 'hidden' as const,
}))
</script>

<template>
  <div
    :style="{
      display: 'flex',
      width: '100%',
      height: '100%',
      background: C.ground,
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: PIXEL,
    }"
  >
    <div :style="panelStyle">
      <!-- Header band -->
      <div
        style="display: flex; align-items: center; justify-content: space-between;"
      >
        <div style="display: flex; align-items: center;">
          <div
            :style="{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              marginRight: '20px',
            }"
          >
            <img
              v-if="emblem"
              :src="emblem"
              :style="{
                position: 'absolute',
                top: '-8px',
                left: '-8px',
                width: '96px',
                height: '96px',
                imageRendering: 'pixelated',
              }"
              alt=""
            >
            <img
              v-if="icon"
              :src="icon"
              width="44"
              height="44"
              :style="{ position: 'relative', objectFit: 'contain', imageRendering: 'pixelated' }"
              alt=""
            >
          </div>
          <div style="display: flex; flex-direction: column;">
            <span
              :style="{
                display: 'flex',
                fontFamily: PIXEL,
                fontSize: '46px',
                lineHeight: 1,
                color,
                textShadow: '3px 3px 0 rgba(0,0,0,0.45)',
              }"
            >{{ name }}</span>
            <div
              style="display: flex; gap: 8px; margin-top: 12px; align-items: center;"
            >
              <span
                :style="{
                  display: 'flex',
                  fontFamily: FIVE,
                  fontSize: '20px',
                  lineHeight: 1,
                  color: '#0c0e12',
                  background: color,
                  padding: '4px 9px',
                  borderRadius: '3px',
                }"
              >{{ tier.toLowerCase() }}</span>
              <span
                :style="{
                  display: 'flex',
                  fontFamily: FIVE,
                  fontSize: '20px',
                  lineHeight: 1,
                  color: '#0c0e12',
                  background: light,
                  padding: '4px 9px',
                  borderRadius: '3px',
                }"
              >{{ subType }}</span>
              <img
                v-for="(el, i) in elementIcons"
                :key="i"
                :src="el"
                width="24"
                height="24"
                :style="{ objectFit: 'contain', imageRendering: 'pixelated' }"
                alt=""
              >
            </div>
          </div>
        </div>
        <div :style="{ display: 'flex', alignItems: 'center', gap: '10px' }">
          <img
            src="/favicon.svg"
            width="22"
            height="22"
            alt=""
          >
          <div :style="{ display: 'flex', fontFamily: SANS, fontSize: '15px', letterSpacing: '-0.02em', color: C.text }">
            <span :style="{ display: 'flex' }">wynn</span>
            <span :style="{ display: 'flex', color: C.brand }">.</span>
            <span :style="{ display: 'flex' }">tools</span>
          </div>
        </div>
      </div>

      <div
        :style="{
          display: 'flex',
          height: '2px',
          background: '#ffffff22',
          margin: '20px 0',
        }"
      />

      <!-- Two columns -->
      <div style="display: flex; flex: 1;">
        <!-- LEFT: base + SP + meta -->
        <div
          :style="{
            display: 'flex',
            flexDirection: 'column',
            width: '440px',
            paddingRight: '32px',
          }"
        >
          <!-- Weapon base -->
          <template v-if="isWeapon">
            <div
              v-if="dps != null"
              style="display: flex; align-items: baseline;"
            >
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '40px',
                  lineHeight: 1,
                  color: light,
                }"
              >{{ dps }}</span>
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '22px',
                  marginLeft: '8px',
                  color: C.text,
                }"
              >DPS</span>
            </div>
            <span
              v-if="attackSpeed"
              :style="{
                display: 'flex',
                fontFamily: PIXEL,
                fontSize: '18px',
                color: C.muted,
                marginTop: '8px',
              }"
            >{{ attackSpeed
            }}<template v-if="hits != null">
              ({{ hits }} hits/s)</template></span>
            <div
              style="display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 8px;"
            >
              <span
                v-for="(d, i) in damageLines"
                :key="i"
                style="display: flex; align-items: center;"
              >
                <img
                  v-if="d.iconUrl"
                  :src="d.iconUrl"
                  width="22"
                  height="22"
                  :style="{ marginRight: '7px', objectFit: 'contain', imageRendering: 'pixelated' }"
                  alt=""
                >
                <span
                  :style="{
                    display: 'flex',
                    fontFamily: PIXEL,
                    fontSize: '18px',
                    color: C.muted,
                  }"
                >{{ d.text }}</span>
              </span>
            </div>
          </template>
          <!-- Armour / accessory base -->
          <template v-else>
            <div
              v-if="health != null"
              style="display: flex; align-items: baseline;"
            >
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '40px',
                  lineHeight: 1,
                  color: light,
                }"
              >{{ health > 0 ? '+' : '' }}{{ health }}</span>
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '22px',
                  marginLeft: '8px',
                  color: C.text,
                }"
              >Health</span>
            </div>
            <div
              v-if="defenceLines.length"
              style="display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px;"
            >
              <span
                v-for="(d, i) in defenceLines"
                :key="i"
                style="display: flex; align-items: center;"
              >
                <img
                  :src="d.iconUrl"
                  width="22"
                  height="22"
                  :style="{ marginRight: '7px', objectFit: 'contain', imageRendering: 'pixelated' }"
                  alt=""
                >
                <span
                  :style="{
                    display: 'flex',
                    fontFamily: PIXEL,
                    fontSize: '18px',
                    color: C.muted,
                  }"
                >{{ d.value }}</span>
              </span>
            </div>
          </template>

          <!-- SP discs -->
          <div style="display: flex; gap: 16px; margin-top: 22px;">
            <div
              v-for="(c, i) in sp"
              :key="i"
              style="display: flex; flex-direction: column; align-items: center;"
            >
              <div
                style="display: flex; position: relative; width: 50px; height: 50px; align-items: center; justify-content: center;"
              >
                <img
                  :src="c.discUrl"
                  :style="{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '50px',
                    height: '50px',
                    imageRendering: 'pixelated',
                  }"
                  alt=""
                >
                <img
                  :src="c.iconUrl"
                  width="28"
                  height="28"
                  :style="{ position: 'relative', objectFit: 'contain', imageRendering: 'pixelated' }"
                  :alt="c.skill"
                >
              </div>
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '16px',
                  marginTop: '4px',
                  color: c.valueColor,
                }"
              >{{ c.value }}</span>
            </div>
          </div>

          <!-- Class / level meta -->
          <div style="display: flex; flex-direction: column; margin-top: 22px;">
            <div
              v-if="classReq"
              style="display: flex; justify-content: space-between;"
            >
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '18px',
                  color: C.text,
                }"
              >Class Req</span>
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '18px',
                  color: C.muted,
                }"
              >{{ classReq }}</span>
            </div>
            <div
              style="display: flex; justify-content: space-between; margin-top: 4px;"
            >
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '18px',
                  color: C.text,
                }"
              >Combat Level</span>
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '18px',
                  color: C.muted,
                }"
              >{{ combatLevel }}</span>
            </div>
            <div v-if="powderSlots" style="display: flex; margin-top: 4px;">
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '18px',
                  color: C.muted,
                }"
              >Powder Slots [{{ 'o'.repeat(powderSlots) }}]</span>
            </div>
          </div>
        </div>

        <!-- RIGHT: ids + majors + lore -->
        <div
          :style="{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingLeft: '32px',
            borderLeft: '1px solid #ffffff1a',
          }"
        >
          <div style="display: flex; flex-direction: column;">
            <div
              v-for="(row, i) in shownIds"
              :key="i"
              style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 3px;"
            >
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '17px',
                  color: row.color,
                  width: '70px',
                }"
              >{{ row.left }}</span>
              <span
                :style="{
                  display: 'flex',
                  flex: 1,
                  fontFamily: PIXEL,
                  fontSize: '17px',
                  color: C.text,
                  justifyContent: 'center',
                }"
              >{{ row.label }}</span>
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '17px',
                  color: row.color,
                  width: '70px',
                  justifyContent: 'flex-end',
                }"
              >{{ row.right }}</span>
            </div>
            <span
              v-if="hiddenIdCount > 0"
              :style="{
                display: 'flex',
                fontFamily: SANS,
                fontSize: '14px',
                color: C.faint,
                marginTop: '4px',
              }"
            >+{{ hiddenIdCount }} more</span>
          </div>

          <div
            v-if="shownMajors.length"
            style="display: flex; flex-direction: column; margin-top: 16px;"
          >
            <div
              v-for="(m, i) in shownMajors"
              :key="i"
              style="display: flex; flex-direction: column; margin-bottom: 8px;"
            >
              <span
                :style="{
                  display: 'flex',
                  fontFamily: PIXEL,
                  fontSize: '17px',
                  color: light,
                }"
              >{{ m.name }}</span>
              <span
                :style="{
                  display: 'flex',
                  fontFamily: SANS,
                  fontSize: '14px',
                  color: C.muted,
                  lineHeight: 1.35,
                }"
              >{{ m.text }}</span>
            </div>
          </div>

          <span
            v-if="loreText"
            :style="{
              display: 'flex',
              fontFamily: SANS,
              fontSize: '14px',
              color: C.muted,
              lineHeight: 1.4,
              marginTop: '14px',
            }"
          >{{ loreText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
