import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

// T1 — criterion: "an @/ import resolves". If `paths` or `resolve.alias` is missing,
// this import fails and the suite errors rather than silently passing.
describe('the @/ path alias', () => {
  it('resolves to src and yields a working module', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('resolves the real module, not a stub', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
