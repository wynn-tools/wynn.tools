import type { CreditsMap, NormalizedBuildImport } from '../shared/types.js'
import creditsData from './credits.json' with { type: 'json' }
import { SUGVON_SOURCE } from './source'

// Strip the leading "> " blockquote prefix (may have multiple spaces / blank)
function stripQuote(line: string): string {
  return line.replace(/^>\s?/, '')
}

// Extract the URL from a markdown link target: [label](url)
// Returns the parenthesized URL (not the label).
function extractUrl(text: string): string | null {
  const m = text.match(/\(([^)]+)\)/)
  return m ? m[1] : null
}

// Determine player class from the outer Spoiler heading
function mapClass(spoiler: string): string {
  const s = spoiler.toLowerCase()
  if (s === 'warrior')
    return 'warrior'
  if (s === 'archer')
    return 'archer'
  if (s === 'mage')
    return 'mage'
  if (s === 'shaman')
    return 'shaman'
  if (s === 'assassin')
    return 'assassin'
  return spoiler.toLowerCase()
}

interface Variant {
  buildString: string
  label: string | null // null means single-variant (no bracket label)
  credit: string | null // per-variant credit line, if any
}

interface ParsedBuild {
  name: string
  playerClass: string
  baseCredit: string | null // the "By X" with no variant prefix
  variants: Variant[]
  tags: string[]
  tutorialUrls: string[]
  notes: string[]
}

// Parse "By X" / "By X and Y" / variant-prefixed "Foo Build By X and Y, Z" credit lines.
// Handles commas as additional separators alongside "and".
// Returns { primary, secondaries } where values are raw display names.
function parseCredit(creditStr: string): { primary: string, secondaries: string[] } {
  // Strip leading variant prefix (everything up to and including the LAST "By "),
  // case-insensitive. This handles the "by By" double-prefix typo in the source.
  // Use lastIndexOf-based approach to avoid backtracking in greedy regex.
  const lowerStr = creditStr.toLowerCase()
  const lastByIdx = lowerStr.lastIndexOf(' by ')
  let names: string
  if (lastByIdx >= 0) {
    names = creditStr.slice(lastByIdx + 4).trim()
  }
  else if (lowerStr.startsWith('by ')) {
    names = creditStr.slice(3).trim()
  }
  else {
    return { primary: creditStr.trim(), secondaries: [] }
  }
  // If the captured names still start with "By " (double-prefix typo), strip it
  if (/^[Bb]y /.test(names))
    names = names.slice(3).trim()
  // Split on ", and " / " and " / ", " (handles lists of 3+ with commas)
  // Use a plain string split approach to avoid backtracking
  const parts = names
    .replace(/, and /gi, ',')
    .replace(/ and /gi, ',')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return {
    primary: parts[0] ?? creditStr.trim(),
    secondaries: parts.slice(1),
  }
}

// Attempt to classify a line as a per-variant credit prefix.
// e.g. "Non Crafted Build By Monaiim" → true (has prefix before "By")
// e.g. "By Pandamonium" → false (nothing meaningful before "By")
function isVariantCreditLine(line: string): boolean {
  const byIdx = line.search(/\bby\b/i)
  if (byIdx < 2)
    return false // nothing meaningful before "By"
  const prefix = line.slice(0, byIdx).trim()
  return prefix.length > 0
}

export function parseSugvon(): NormalizedBuildImport[] {
  const lines = SUGVON_SOURCE.split('\n')

  const results: NormalizedBuildImport[] = []

  let currentClass = 'unknown'

  // State for the current build being accumulated
  let currentBuild: ParsedBuild | null = null
  // Pending per-variant credit for the NEXT link line
  let pendingVariantCredit: string | null = null

  function flushBuild() {
    if (!currentBuild)
      return
    const b = currentBuild
    currentBuild = null

    if (b.variants.length === 0)
      return

    const multiVariant = b.variants.length > 1

    for (const variant of b.variants) {
      // Determine credit for this variant
      const creditStr = variant.credit ?? b.baseCredit
      let primary: string
      let secondaries: string[]

      if (creditStr) {
        const parsed = parseCredit(creditStr)
        primary = parsed.primary
        secondaries = parsed.secondaries
      }
      else {
        // No credit line at all → anonymous
        primary = 'anonymous'
        secondaries = []
      }

      const name = multiVariant && variant.label
        ? `${b.name} (${variant.label})`
        : b.name

      const tutorialUrl = b.tutorialUrls.length > 0 ? b.tutorialUrls[0] : undefined
      const notes = b.notes.length > 0 ? b.notes.join('\n') : undefined

      results.push({
        name,
        buildString: variant.buildString,
        playerClass: b.playerClass,
        primaryCredit: primary,
        secondaryCredits: secondaries,
        tags: b.tags,
        tutorialUrl,
        notes,
        source: 'sugvon',
      })
    }
  }

  for (const rawLine of lines) {
    const line = stripQuote(rawLine).trimEnd()

    // ── Outer class spoiler (depth 0 — just "Spoiler: ClassName")
    const spoilerMatch = line.match(/^Spoiler: (.+)/)
    if (spoilerMatch) {
      const label = spoilerMatch[1].trim()
      if (['Warrior', 'Archer', 'Mage', 'Shaman', 'Assassin'].includes(label)) {
        currentClass = mapClass(label)
      }
      continue
    }

    // ── Build header: **Name**  (bold markdown, may have trailing spaces)
    // Exclude lines starting with \- (notes) or purely formatting text
    const headerMatch = line.match(/^\*\*([^*\\][^*]*)\*\*\s*$/)
    if (headerMatch) {
      flushBuild()
      pendingVariantCredit = null
      currentBuild = {
        name: headerMatch[1].trim(),
        playerClass: currentClass,
        baseCredit: null,
        variants: [],
        tags: [],
        tutorialUrls: [],
        notes: [],
      }
      continue
    }

    if (!currentBuild)
      continue

    // ── Notes section marker or dash-prefixed notes
    // MUST be checked BEFORE credit check (some notes contain "by X" attribution)
    if (line === 'Notes:' || line === 'Notes') {
      continue
    }
    if (line.startsWith('\\-') || line.startsWith('- ') || line.startsWith('**\\-')) {
      const note = line.replace(/^\*{0,2}\\?-\s*/, '').trim()
      if (note)
        currentBuild.notes.push(note)
      continue
    }

    // ── Tutorial URL line: [Tutorial Link](url) or [Tutorial Link for X](url)
    // MUST be checked BEFORE the generic URL check below
    if (/^\[Tutorial/i.test(line)) {
      const url = extractUrl(line)
      if (url)
        currentBuild.tutorialUrls.push(url)
      continue
    }

    // ── Credit line: starts with "By " (case-insensitive) OR variant-prefixed
    if (/^by\s+/i.test(line) || isVariantCreditLine(line)) {
      if (isVariantCreditLine(line)) {
        // Variant-prefixed credit (e.g. "Non Crafted Build By X") → attach to next URL
        pendingVariantCredit = line.trim()
      }
      else {
        // Plain "By X" → base credit for all variants
        currentBuild.baseCredit = line.trim()
        pendingVariantCredit = null
      }
      continue
    }

    // ── URL / link line (builder URLs only — youtu.be etc. are not build strings)
    // Only match lines that contain a wynnbuilder URL or a link whose parens point there
    const hasBuilderUrl = line.includes('wynnbuilder')
    const hasBracketLink = line.match(/^\[https?:/)
    if (hasBuilderUrl || hasBracketLink) {
      // Extract URL from markdown parens if present, else use bare URL
      let url: string | null = null
      if (line.includes('](')) {
        url = extractUrl(line)
      }
      else {
        const m = line.match(/(https?:\/\/\S+)/)
        url = m ? m[1] : null
      }
      if (!url)
        continue

      // Reject non-builder URLs (e.g. youtube) that may appear in notes/inline
      if (!url.includes('wynnbuilder') && !url.includes('wynnbuilder-beta'))
        continue

      // Extract fragment (hash) only
      const hashIdx = url.indexOf('#')
      const buildString = hashIdx >= 0 ? url.slice(hashIdx + 1) : url

      // Skip if empty build string
      if (!buildString)
        continue

      // Extract variant label from \[Label\] suffix (escaped brackets in markdown)
      const escapedMatch = line.match(/\\\[([^\]]+)\\\]\s*$/)
      // Also handle plain [Label] that appears AFTER the link group
      // The markdown link is [...](url), so after the closing ) look for [Label]
      const afterParen = line.replace(/\[.*?\]\(.*?\)/, '')
      const plainMatch = afterParen.match(/\[([^\]]+)\]\s*$/)

      let variantLabel: string | null = null
      if (escapedMatch) {
        variantLabel = escapedMatch[1].trim()
      }
      else if (plainMatch) {
        const candidate = plainMatch[1].trim()
        if (!candidate.startsWith('http')) {
          variantLabel = candidate
        }
      }

      // If no explicit label on the URL but we have a variant-prefixed credit,
      // derive the label from the credit prefix (everything before "By")
      if (variantLabel === null && pendingVariantCredit !== null) {
        const byIdx = pendingVariantCredit.search(/\bby\b/i)
        if (byIdx > 0) {
          variantLabel = pendingVariantCredit.slice(0, byIdx).replace(/\s+Build\s*$/i, '').trim() || null
        }
      }

      currentBuild.variants.push({
        buildString,
        label: variantLabel,
        credit: pendingVariantCredit,
      })
      pendingVariantCredit = null
      continue
    }

    // ── Uses: line
    if (line.startsWith('Uses:')) {
      const tagsStr = line.replace(/^Uses:\s*/, '')
      const tags = tagsStr.split(',').map(s => s.trim()).filter(Boolean)
      currentBuild.tags.push(...tags)
      continue
    }
  }

  // Flush the final build
  flushBuild()

  return results
}

export function loadCredits(): CreditsMap {
  return creditsData as CreditsMap
}

export function validateCredits(
  entries: NormalizedBuildImport[],
  credits: CreditsMap,
): string[] {
  const missing: string[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const allCredits = [entry.primaryCredit, ...entry.secondaryCredits]
    for (const credit of allCredits) {
      if (!seen.has(credit)) {
        seen.add(credit)
        if (!(credit in credits)) {
          missing.push(credit)
        }
      }
    }
  }

  return missing
}
