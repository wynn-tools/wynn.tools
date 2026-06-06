export interface NormalizedBuildImport {
  name: string
  buildString: string
  playerClass: string
  primaryCredit: string
  secondaryCredits: string[]
  tags: string[]
  tutorialUrl?: string
  notes?: string
  source: 'build-db' | 'sugvon'
}

export interface CreditEntry {
  handle: string
  kind: 'person' | 'community' | 'anonymous'
  profileUrl?: string
  // When set, the resolver links to this existing users.id verbatim — no
  // synthetic row is created. Use this when the credited person already has
  // a real account on the site (slug collision would otherwise abort).
  userId?: string
}

export type CreditsMap = Record<string, CreditEntry>
