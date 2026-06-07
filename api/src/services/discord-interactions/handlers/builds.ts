import type { BuildSearchFilters, BuildSearchResult } from '../build-search'
import type { ItemIndex } from '../item-index'
import type { Interaction, InteractionResponse } from '../types'
import { env } from '../../../env'
import { tagDisplayLabel } from '../../../lib/build-tags'
import { BUILDS_PAGE_SIZE, decodeFilters, encodeFilters, searchBuilds } from '../build-search'
import { ephemeral } from '../dispatch'
import { getOption, ResponseType } from '../types'

const COMPONENTS_V2_FLAG = 1 << 15

const COMP = {
  ACTION_ROW: 1,
  BUTTON: 2,
  SECTION: 9,
  TEXT_DISPLAY: 10,
  SEPARATOR: 14,
  CONTAINER: 17,
} as const

const BTN = { PRIMARY: 1, SECONDARY: 2, LINK: 5 } as const

const CLASS_COLORS: Record<string, number> = {
  archer: 0x7FB069,
  warrior: 0xD9A05B,
  mage: 0x6FA8DC,
  assassin: 0xA77BCA,
  shaman: 0xD97F7F,
}
const DEFAULT_ACCENT = 0x4A8FE7

function extractFilters(interaction: Interaction, index: ItemIndex): BuildSearchFilters {
  const userOpt = interaction.data?.options?.find(o => o.name === 'user')
  const discordUserId = userOpt?.value ? String(userOpt.value) : undefined
  const playerClass = getOption(interaction, 'class')
  const itemName = getOption(interaction, 'item')
  const item = itemName ? index.get(itemName) : undefined
  const nameQuery = getOption(interaction, 'name')
  const tag = getOption(interaction, 'tag')
  return { discordUserId, playerClass, itemId: item?.id, nameQuery, tag }
}

export async function handleBuilds(interaction: Interaction, index: ItemIndex): Promise<InteractionResponse> {
  return renderPage(extractFilters(interaction, index), 0)
}

export async function handleBuildsComponent(interaction: Interaction): Promise<InteractionResponse> {
  const customId = interaction.data?.custom_id ?? ''
  const decoded = decodeFilters(customId)
  if (!decoded)
    return ephemeral('Invalid pagination state')
  const rendered = await renderPage(decoded.filters, decoded.page)
  return { ...rendered, type: ResponseType.UPDATE_MESSAGE }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

function filterSummary(filters: BuildSearchFilters, itemName?: string): string {
  const parts: string[] = []
  if (filters.discordUserId)
    parts.push(`user: <@${filters.discordUserId}>`)
  if (filters.playerClass)
    parts.push(`class: ${filters.playerClass}`)
  if (itemName)
    parts.push(`item: ${itemName}`)
  if (filters.tag)
    parts.push(`tag: ${tagDisplayLabel(filters.tag)}`)
  if (filters.nameQuery)
    parts.push(`"${filters.nameQuery}"`)
  return parts.join(' · ')
}

function ownerLabel(owner: BuildSearchResult['owner']): string {
  if (!owner)
    return 'unknown'
  return owner.displayName ?? owner.username
}

function classLabel(playerClass: string | null): string {
  if (!playerClass)
    return 'Unknown class'
  return playerClass.charAt(0).toUpperCase() + playerClass.slice(1)
}

function buildSection(r: BuildSearchResult, frontend: string) {
  const tags = r.tags.slice(0, 4).map(tagDisplayLabel).join(' · ')
  const headline = `**${truncate(r.name, 70)}**`
  const meta = `${classLabel(r.playerClass)} · by ${ownerLabel(r.owner)}${r.hasTutorial ? ' · 🎥' : ''}`
  const tagLine = tags ? `\n-# ${tags}` : ''
  return {
    type: COMP.SECTION,
    components: [{ type: COMP.TEXT_DISPLAY, content: `${headline}\n${meta}${tagLine}` }],
    accessory: { type: COMP.BUTTON, style: BTN.LINK, label: 'Open', url: `${frontend}/b/${r.id}` },
  }
}

function accentColor(filters: BuildSearchFilters): number {
  if (filters.playerClass && CLASS_COLORS[filters.playerClass])
    return CLASS_COLORS[filters.playerClass]
  return DEFAULT_ACCENT
}

async function renderPage(filters: BuildSearchFilters, page: number): Promise<InteractionResponse> {
  if (!filters.discordUserId && !filters.playerClass && filters.itemId === undefined && !filters.nameQuery && !filters.tag)
    return ephemeral('Provide at least one filter: user, class, item, name, or tag.')

  const { results, total, unlinkedUser } = await searchBuilds(filters, page)
  if (unlinkedUser)
    return ephemeral('This user hasn\'t linked a wynn.tools account.')
  if (total === 0) {
    const summary = filterSummary(filters)
    return ephemeral(summary ? `No builds matched · ${summary}` : 'No builds matched.')
  }

  const frontend = env().FRONTEND_URL.replace(/\/$/, '')
  const totalPages = Math.ceil(total / BUILDS_PAGE_SIZE)
  const summary = filterSummary(filters)

  const header = {
    type: COMP.TEXT_DISPLAY,
    content: `## Builds (${total})${summary ? `\n-# ${summary}` : ''}`,
  }

  const sections = results.map(r => buildSection(r, frontend))
  const separator = { type: COMP.SEPARATOR, divider: true, spacing: 1 }

  const children: unknown[] = [header, separator, ...sections]

  if (totalPages > 1) {
    children.push(separator)
    children.push({
      type: COMP.ACTION_ROW,
      components: [
        {
          type: COMP.BUTTON,
          style: BTN.SECONDARY,
          label: 'Prev',
          custom_id: encodeFilters(filters, Math.max(0, page - 1)),
          disabled: page === 0,
        },
        {
          type: COMP.BUTTON,
          style: BTN.SECONDARY,
          label: `Page ${page + 1}/${totalPages}`,
          custom_id: 'builds:noop',
          disabled: true,
        },
        {
          type: COMP.BUTTON,
          style: BTN.SECONDARY,
          label: 'Next',
          custom_id: encodeFilters(filters, Math.min(totalPages - 1, page + 1)),
          disabled: page >= totalPages - 1,
        },
      ],
    })
  }

  const container = {
    type: COMP.CONTAINER,
    accent_color: accentColor(filters),
    components: children,
  }

  return {
    type: ResponseType.CHANNEL_MESSAGE,
    data: {
      flags: COMPONENTS_V2_FLAG,
      components: [container],
    },
  }
}
