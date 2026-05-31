import { Buffer } from 'node:buffer'

function base64NoPad(str: string): string {
  return Buffer.from(str).toString('base64').replace(/=+$/, '')
}

function needsBase64(s: string): boolean {
  return /[^a-z0-9]/i.test(s)
}

export function buildOgImagePath(
  component: string,
  props: Record<string, unknown>,
  pagePath: string,
): string {
  const parts: string[] = [`c_${component}`]
  const complexProps: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined)
      continue
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      complexProps[key] = value
    }
    else if (typeof value === 'string') {
      parts.push(`${key}_${needsBase64(value) ? `~${base64NoPad(value)}` : value}`)
    }
    else {
      // number or boolean
      parts.push(`${key}_${value}`)
    }
  }

  if (Object.keys(complexProps).length > 0)
    parts.push(`props_${base64NoPad(JSON.stringify(complexProps))}`)

  parts.push(`p_${base64NoPad(JSON.stringify(pagePath))}`)

  return `/_og/d/${parts.join(',')}.png`
}
