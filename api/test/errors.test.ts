import { describe, expect, it } from 'vitest'
import { testApp } from './helpers/app'

describe('error envelope + health', () => {
  it('returns ok from health', async () => {
    const res = await testApp()('/v1/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  it('maps AppError to the envelope', async () => {
    const res = await testApp()('/v1/health/boom')
    expect(res.status).toBe(418)
    expect(await res.json()).toEqual({
      error: { code: 'teapot', message: 'boom' },
    })
  })
})
