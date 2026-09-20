import type { BuildMeta } from '~/lib/build/build-meta'
import type { ItemMeta } from '~/lib/items/item-meta'
import type { StockCreation } from '~/lib/types/stock'

interface TextDisplay { type: 10, content: string }
interface Thumbnail { type: 11, media: { url: string }, description?: string }
interface LinkButton { type: 2, style: 5, label: string, url: string }
interface ActionRow { type: 1, components: LinkButton[] }
interface Section { type: 9, components: TextDisplay[], accessory: Thumbnail }
interface MediaGallery { type: 12, items: { media: { url: string }, description?: string }[] }
interface Separator { type: 14, divider?: boolean, spacing?: 1 | 2 }
type Child = TextDisplay | Section | MediaGallery | Separator | ActionRow
export interface DiscordContainer { type: 17, accent_color?: number, components: Child[] }

const CLASS_ACCENT: Record<string, number> = {
  Warrior: 0xE05A4E,
  Mage: 0x4E9BE0,
  Archer: 0x4EC06A,
  Assassin: 0xE0B84E,
  Shaman: 0xA06AE0,
}

const STOCK_ACCENT: Record<StockCreation['kind'], number> = {
  'infobox': 0x4D9AFF,
  'custom-bar': 0xFFB347,
  'bundle': 0xBE93FF,
}

function hexToInt(hex: string) {
  return Number.parseInt(hex.slice(1), 16)
}

function text(content: string): TextDisplay {
  return { type: 10, content }
}

function buttons(...list: LinkButton[]): ActionRow {
  return { type: 1, components: list }
}

function link(label: string, url: string): LinkButton {
  return { type: 2, style: 5, label, url }
}

function headline(content: string, thumbUrl: string | null, alt: string): Section | TextDisplay {
  return thumbUrl
    ? { type: 9, components: [text(content)], accessory: { type: 11, media: { url: thumbUrl }, description: alt } }
    : text(content)
}

export function itemEmbed(meta: ItemMeta, pageUrl: string): DiscordContainer {
  const head = [`# ${meta.name}`, `**${meta.tier} ${meta.subType}** · Combat Lv. ${meta.combatLevel}`]
  if (meta.classReq)
    head.push(`Class: ${meta.classReq}`)
  const sp = meta.sp.filter(s => s.active).map(s => `${s.skill[0]!.toUpperCase()}${s.skill.slice(1)} ${s.value}`)
  if (sp.length)
    head.push(`Req: ${sp.join(' · ')}`)

  const base: string[] = []
  if (meta.attackSpeed)
    base.push(`${meta.attackSpeed} · ${meta.dps ?? '?'} avg DPS`)
  if (meta.damageLines.length)
    base.push(`Damage: ${meta.damageLines.map(d => d.text).join(' / ')}`)
  if (meta.health != null)
    base.push(`Health: ${meta.health}`)
  if (meta.defenceLines.length)
    base.push(`Defence: ${meta.defenceLines.map(d => d.value).join(' / ')}`)

  const ids = meta.idRows.map(r => `${r.left ? `${r.left} to ${r.right}` : r.right} ${r.label}`)
  const majors = meta.majorIds.map(m => `**${m.name}:** ${m.text}`)

  const body = [base.join('\n'), ids.join('\n'), majors.join('\n')].filter(Boolean).join('\n\n')

  const components: Child[] = [headline(head.join('\n'), meta.icon, meta.name)]
  if (body)
    components.push(text(body.slice(0, 2000)))
  components.push(buttons(link('View on wynn.tools', pageUrl)))

  return { type: 17, accent_color: hexToInt(meta.color), components }
}

export function buildEmbed(meta: BuildMeta, notes: string, pageUrl: string, forkUrl?: string): DiscordContainer {
  const title = meta.name ?? `Level ${meta.level} ${meta.className}`
  const head = [`# ${title}`, `**Level ${meta.level} ${meta.className}**${meta.owner ? ` · by ${meta.owner}` : ''}`]
  if (meta.tags.length)
    head.push(meta.tags.map(t => `\`${t}\``).join(' '))

  const items = meta.items.filter(i => i.name !== '—').map(i => `- ${i.name}${i.powders ? ` \`${i.powders}\`` : ''}`)
  const stats = [
    `**HP** ${meta.totalHp} · **EHP** ${Math.round(meta.ehp)}`,
    ...meta.combatLines.map(c => `**${c.name}** ${Math.round(c.dps)} DPS`),
  ]

  const components: Child[] = [headline(head.join('\n'), meta.weaponIconUrl, meta.className)]
  if (notes)
    components.push(text(notes.slice(0, 600)))
  components.push(text([items.join('\n'), stats.join('\n')].filter(Boolean).join('\n\n')))
  const actions = [link('Open build', pageUrl)]
  if (forkUrl)
    actions.push(link('Fork in builder', forkUrl))
  components.push(buttons(...actions))

  return { type: 17, accent_color: CLASS_ACCENT[meta.className], components }
}

export function stockEmbed(c: StockCreation, pageUrl: string, blobUrl: (sha: string) => string): DiscordContainer {
  const badges = [c.kind, c.category, ...c.classes].map(b => `\`${b.toUpperCase()}\``).join(' · ')
  const author = c.author.displayName ?? c.author.username
  const body = `# ${c.title}\n${badges}\n\n${c.description.slice(0, 800)}\n\nby ${author}`

  const components: Child[] = [text(body)]
  const media = [...c.media].sort((a, b) => a.order - b.order).slice(0, 10)
  if (media.length) {
    components.push({
      type: 12,
      items: media.map(m => ({ media: { url: blobUrl(m.blobSha256) }, ...(m.caption ? { description: m.caption } : {}) })),
    })
  }
  components.push({ type: 14, divider: true, spacing: 1 }, buttons(link('Open on wynn.tools', pageUrl)))

  return { type: 17, accent_color: STOCK_ACCENT[c.kind], components }
}
