import { createApp } from '../../src/app'

/** Returns a fetch-style request runner against a fresh app instance. */
export function testApp() {
  const app = createApp()
  return (path: string, init?: RequestInit) =>
    app.request(`http://test${path}`, init)
}
