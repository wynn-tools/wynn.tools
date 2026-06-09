import process from 'node:process'

interface CdnVersion {
  gameVersion: string
  fetchedAt: string | null
  hash: string
}

interface GitHubRepo {
  stargazers_count: number
}

interface GitHubContributor {
  type: string
}

interface HomeStats {
  version: { gameVersion: string, fetchedAt: string | null } | null
  builds: { totalPublic: number } | null
  github: { stars: number, contributors: number } | null
}

const CACHE_MS = 5 * 60 * 1000
let cached: { value: HomeStats, expiresAt: number } | null = null

async function fetchVersion(cdnBaseUrl: string): Promise<HomeStats['version']> {
  const url = new URL('versions.json', cdnBaseUrl.endsWith('/') ? cdnBaseUrl : `${cdnBaseUrl}/`).toString()
  const list = await $fetch<CdnVersion[]>(url, { responseType: 'json' })
  if (!Array.isArray(list) || list.length === 0)
    return null
  const newest = list.reduce((best, v) => {
    if (!v.fetchedAt)
      return best
    if (!best || new Date(v.fetchedAt) > new Date(best.fetchedAt!))
      return v
    return best
  }, null as CdnVersion | null) ?? list[list.length - 1]!
  return { gameVersion: newest.gameVersion, fetchedAt: newest.fetchedAt }
}

async function fetchBuilds(apiBaseUrl: string): Promise<HomeStats['builds']> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/v1/builds/stats`
  const data = await $fetch<{ totalPublic: number }>(url, { responseType: 'json' })
  return { totalPublic: data.totalPublic }
}

async function fetchGitHub(token: string | undefined): Promise<HomeStats['github']> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'wynn.tools-home-stats',
  }
  if (token)
    headers.Authorization = `Bearer ${token}`
  const repo = await $fetch<GitHubRepo>('https://api.github.com/repos/wynn-tools/wynn.tools', { headers })
  const contributors = await $fetch<GitHubContributor[]>(
    'https://api.github.com/repos/wynn-tools/wynn.tools/contributors?per_page=100&anon=0',
    { headers },
  )
  const humans = Array.isArray(contributors)
    ? contributors.filter(c => c.type === 'User').length
    : 0
  return { stars: repo.stargazers_count, contributors: humans }
}

async function settle<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p
  }
  catch {
    return null
  }
}

export default defineEventHandler(async (): Promise<HomeStats> => {
  const now = Date.now()
  if (cached && cached.expiresAt > now)
    return cached.value
  const config = useRuntimeConfig()
  const cdnBaseUrl = config.public.cdnBaseUrl as string
  const apiBaseUrl = config.public.apiBaseUrl as string
  const ghToken = process.env.GITHUB_TOKEN

  const [version, builds, github] = await Promise.all([
    settle(fetchVersion(cdnBaseUrl)),
    settle(fetchBuilds(apiBaseUrl)),
    settle(fetchGitHub(ghToken)),
  ])
  const value: HomeStats = { version, builds, github }
  cached = { value, expiresAt: now + CACHE_MS }
  return value
})
