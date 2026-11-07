import { describe, expect, it } from 'vitest'
import { greet } from './greet.use-case.ts'

describe('greet', () => {
  it('greets by name', () => {
    expect(greet('world').message).toBe('Hello, world!')
  })
})
