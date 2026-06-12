export const COMPONENTS_V2_FLAG = 1 << 15

export interface CreationCard {
  title: string
  description: string
  kindBadge: string
  classes: string[]
  categoryBadge: string
  authorMention: string
  linkUrl: string
  accentColor: number
}

export function buildCreationCard(c: CreationCard) {
  const badges = [c.kindBadge, c.categoryBadge, ...c.classes]
    .map(b => `\`${b}\``)
    .join(' · ')
  const text = `# ${c.title}\n${badges}\n\n${c.description.slice(0, 800)}\n\nby ${c.authorMention}`
  return {
    flags: COMPONENTS_V2_FLAG,
    components: [
      {
        type: 17,
        accent_color: c.accentColor,
        components: [
          { type: 10, content: text },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: 'Open on wynn.tools',
                url: c.linkUrl,
              },
            ],
          },
        ],
      },
    ],
  } as const
}

export interface VersionReply {
  versionLabel: string
  changelog: string
  linkUrl: string
  accentColor: number
}

export function buildVersionReply(v: VersionReply) {
  const text = `**${v.versionLabel} published**\n${v.changelog.slice(0, 1500)}`
  return {
    flags: COMPONENTS_V2_FLAG,
    components: [
      {
        type: 17,
        accent_color: v.accentColor,
        components: [
          { type: 10, content: text },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: `View ${v.versionLabel}`,
                url: v.linkUrl,
              },
            ],
          },
        ],
      },
    ],
  } as const
}
