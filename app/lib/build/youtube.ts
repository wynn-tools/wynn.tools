const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'])

export function parseYouTubeUrl(input: string): { id: string, canonical: string } | null {
  if (!input || input.length > 500)
    return null
  let url: URL
  try {
    url = new URL(input)
  }
  catch {
    return null
  }
  if (url.protocol !== 'https:')
    return null
  if (!HOSTS.has(url.hostname))
    return null
  let id: string | null = null
  if (url.hostname === 'youtu.be')
    id = url.pathname.slice(1).split('/')[0] || null
  else if (url.pathname === '/watch')
    id = url.searchParams.get('v')
  else if (url.pathname.startsWith('/shorts/'))
    id = url.pathname.slice('/shorts/'.length).split('/')[0] || null
  else if (url.pathname.startsWith('/embed/'))
    id = url.pathname.slice('/embed/'.length).split('/')[0] || null
  if (!id || !/^[\w-]{6,}$/.test(id))
    return null
  return { id, canonical: `https://www.youtube.com/watch?v=${id}` }
}
