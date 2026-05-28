/**
 * Minimal type stubs for Nuxt globals that are auto-imported in the app's
 * composables but not available in the standalone api package's tsc environment.
 * Only the subset needed for type-checking the re-exported modules is declared.
 */
declare function useRuntimeConfig(): {
  public: {
    cdnBaseUrl: string
    athenaUrl: string
  }
}
