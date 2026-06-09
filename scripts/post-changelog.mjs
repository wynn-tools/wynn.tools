#!/usr/bin/env node
// Post changelog entries to the wynn.tools Discord #changelog channel.
//
// Usage:
//   node scripts/post-changelog.mjs <entries.json>
//   node scripts/post-changelog.mjs --dry-run <entries.json>   # print, don't post
//
// entries.json is an array of { title, description } objects, ordered as you
// want them to appear. Discord shows newest message last, so the array is
// posted top-to-bottom — put the OLDEST entry first and the NEWEST last if you
// want the newest to sit at the bottom of the channel.
//
// The bot token is read from api/.env (DISCORD_TOKEN). Channel is resolved by
// name ("changelog") in the wynn.tools guild, so it survives channel re-creation.

import { readFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const API = 'https://discord.com/api/v10'
const GUILD_ID = '1507798652654190622' // wynn.tools
const CHANNEL_NAME = 'changelog'
const ACCENT = 0x2D7FF0 // brand electric blue
const SITE_BASE = 'https://wynn.tools'
const UA = 'wynn.tools-changelog (https://wynn.tools, 1.0)'
const IS_COMPONENTS_V2 = 1 << 15

function readToken() {
  const env = readFileSync(resolve(ROOT, 'api/.env'), 'utf8')
  const line = env.split('\n').find(l => l.startsWith('DISCORD_TOKEN='))
  if (!line)
    throw new Error('DISCORD_TOKEN not found in api/.env')
  return line.slice('DISCORD_TOKEN='.length).trim()
}

async function discord(token, method, path, body, files) {
  for (;;) {
    const headers = { Authorization: `Bot ${token}`, 'User-Agent': UA }
    let bodyInit
    if (files && files.length > 0) {
      const fd = new FormData()
      fd.append('payload_json', JSON.stringify(body))
      files.forEach((f, i) => fd.append(`files[${i}]`, new Blob([f.data], { type: f.contentType }), f.filename))
      bodyInit = fd
    }
    else if (body) {
      headers['Content-Type'] = 'application/json'
      bodyInit = JSON.stringify(body)
    }
    const res = await fetch(API + path, { method, headers, body: bodyInit })
    if (res.status === 429) {
      const info = await res.json()
      const wait = (info.retry_after ?? 1) * 1000 + 250
      console.warn(`  rate limited, waiting ${Math.round(wait)}ms`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    if (!res.ok)
      throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`)
    return res.status === 204 ? null : res.json()
  }
}

async function resolveChannelId(token) {
  const channels = await discord(token, 'GET', `/guilds/${GUILD_ID}/channels`)
  const ch = channels.find(c => c.name === CHANNEL_NAME)
  if (!ch)
    throw new Error(`#${CHANNEL_NAME} channel not found in guild ${GUILD_ID}`)
  return ch.id
}

function resolveUrl(link) {
  if (!link)
    return null
  return link.startsWith('/') ? `${SITE_BASE}${link}` : link
}

const IMAGE_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }

function resolveImage(entry, baseDir) {
  if (!entry.image)
    return null
  if (/^https?:\/\//.test(entry.image))
    return { url: entry.image }
  const abs = isAbsolute(entry.image) ? entry.image : resolve(baseDir, entry.image)
  const filename = basename(abs)
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const contentType = IMAGE_MIME[ext]
  if (!contentType)
    throw new Error(`unsupported image extension for ${entry.image}; supported: ${Object.keys(IMAGE_MIME).join(', ')}`)
  return { attachment: { path: abs, filename, contentType }, url: `attachment://${filename}` }
}

function toMessage(entry, baseDir) {
  if (!entry.title || !entry.description)
    throw new Error(`each entry needs { title, description }; got ${JSON.stringify(entry)}`)
  const inner = [
    { type: 10, content: `## ${entry.title}` },
    { type: 10, content: entry.description },
  ]
  const image = resolveImage(entry, baseDir)
  if (image)
    inner.push({ type: 12, items: [{ media: { url: image.url } }] })
  const url = resolveUrl(entry.link)
  if (url) {
    inner.push({
      type: 1,
      components: [{ type: 2, style: 5, label: entry.linkLabel ?? 'Open', url }],
    })
  }
  const body = {
    flags: IS_COMPONENTS_V2,
    components: [{ type: 17, accent_color: entry.color ?? ACCENT, components: inner }],
  }
  const files = image?.attachment
    ? [{ filename: image.attachment.filename, contentType: image.attachment.contentType, data: readFileSync(image.attachment.path) }]
    : []
  return { body, files }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const file = args.find(a => !a.startsWith('--'))
  if (!file) {
    console.error('usage: node scripts/post-changelog.mjs [--dry-run] <entries.json>')
    process.exit(1)
  }

  const filePath = resolve(process.cwd(), file)
  const baseDir = dirname(filePath)
  const entries = JSON.parse(readFileSync(filePath, 'utf8'))
  if (!Array.isArray(entries))
    throw new Error('entries file must be a JSON array')
  const messages = entries.map(e => toMessage(e, baseDir))

  if (dryRun) {
    console.log(`[dry-run] would post ${messages.length} entr${messages.length === 1 ? 'y' : 'ies'}:`)
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      const url = resolveUrl(e.link)
      console.log(`  • ${e.title}\n      ${e.description.replace(/\n/g, '\n      ')}${e.image ? `\n      [image] ${e.image}` : ''}${url ? `\n      [button] ${e.linkLabel ?? 'Open'} -> ${url}` : ''}`)
    }
    return
  }

  const token = readToken()
  const channelId = await resolveChannelId(token)
  for (let i = 0; i < messages.length; i++) {
    const { body, files } = messages[i]
    const msg = await discord(token, 'POST', `/channels/${channelId}/messages`, body, files)
    console.log(`posted ${msg.id}  ${entries[i].title}`)
    await new Promise(r => setTimeout(r, 600))
  }
  console.log('done.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
