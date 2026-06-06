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
}

export type CreditsMap = Record<string, CreditEntry>
