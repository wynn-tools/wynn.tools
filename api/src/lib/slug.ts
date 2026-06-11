export async function slugForTitle(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = normalize(title) || 'creation'
  if (!(await isTaken(base)))
    return base
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`
    if (!(await isTaken(candidate)))
      return candidate
  }
  throw new Error('slug disambiguator exhausted')
}

function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
