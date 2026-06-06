import process from 'node:process'
import { loadCredits as loadBuildDbCredits, parseBuildDb, validateCredits as validateBuildDb } from './build-db/parse'
import { runImport } from './shared/run'
import { loadCredits as loadSugvonCredits, parseSugvon, validateCredits as validateSugvon } from './sugvon/parse'

type Source = 'build-db' | 'sugvon'
const SOURCES: readonly Source[] = ['build-db', 'sugvon'] as const

async function importBuildDb() {
  const entries = parseBuildDb()
  const credits = loadBuildDbCredits()
  const missing = validateBuildDb(entries, credits)
  if (missing.length)
    throw new Error(`build-db missing credits: ${missing.join(', ')}`)
  console.log(`Importing build-db (${entries.length} entries)…`)
  await runImport({ source: 'build-db', entries, credits })
}

async function importSugvon() {
  const entries = parseSugvon()
  const credits = loadSugvonCredits()
  const missing = validateSugvon(entries, credits)
  if (missing.length)
    throw new Error(`sugvon missing credits: ${missing.join(', ')}`)
  console.log(`Importing sugvon (${entries.length} entries)…`)
  await runImport({ source: 'sugvon', entries, credits })
}

const RUNNERS: Record<Source, () => Promise<void>> = {
  'build-db': importBuildDb,
  'sugvon': importSugvon,
}

async function main() {
  const arg = process.argv[2]
  const selected: Source[] = arg ? [arg as Source] : [...SOURCES]
  if (arg && !SOURCES.includes(arg as Source))
    throw new Error(`Unknown source '${arg}'. Valid: ${SOURCES.join(', ')}`)

  for (const source of selected)
    await RUNNERS[source]()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
