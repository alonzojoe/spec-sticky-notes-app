import { describe, expect, it } from 'vitest'

import { initialsOf, readUserName, USER_KEY } from '@/lib'

/**
 * T78 — the name, and the two letters cut out of it.
 *
 * Pure: no localStorage, no React, no clock. `initialsOf` is four lines and a table of cases, which
 * is the shape of a function that ships wrong, so the table in requirements § D4 is the test.
 */
describe('T78 · initialsOf', () => {
  it('takes the first and last word', () => {
    expect(initialsOf('Joe Alonzo')).toBe('JA')
  })

  // A middle name is not more of you.
  it('ignores everything between them', () => {
    expect(initialsOf('Joe Michael Alonzo')).toBe('JA')
    expect(initialsOf('Ada Byron King Lovelace')).toBe('AL')
  })

  it('gives one letter for one word, never two of it', () => {
    expect(initialsOf('joe')).toBe('J')
  })

  it('collapses whitespace before it reads anything', () => {
    expect(initialsOf('  joe   alonzo  ')).toBe('JA')
    expect(initialsOf('joe\talonzo')).toBe('JA')
  })

  it('has nothing to say about an empty name', () => {
    expect(initialsOf('')).toBe('')
    expect(initialsOf('   ')).toBe('')
  })

  // Not a Latin-alphabet idea. The rule degrades rather than breaking: one code point per word,
  // no reordering, no case where there is no case.
  it('works in a script without case', () => {
    expect(initialsOf('李明')).toBe('李')
    expect(initialsOf('李 明')).toBe('李明')
  })

  /**
   * The case `name[0]` and `name.charAt(0)` both get wrong: an astral character is two UTF-16 code
   * units, and taking one of them renders half a surrogate pair. `Array.from` iterates code points,
   * which is why § D4 specifies it rather than leaving it to whoever writes the function.
   */
  it('keeps an astral character whole', () => {
    expect(initialsOf('𝒥oe 𝒜lonzo')).toBe('𝒥𝒜')
    expect(initialsOf('😀 alonzo')).toBe('😀A')
    // The proof it is not a substring: the naive version yields a lone surrogate here.
    expect([...initialsOf('𝒥oe')]).toHaveLength(1)
  })

  it('is never longer than two code points', () => {
    const names = ['Joe Alonzo', 'a b c d e f', '𝒥 𝒜', '李明王', 'x'.repeat(200)]
    for (const name of names) expect([...initialsOf(name)].length).toBeLessThanOrEqual(2)
  })

  it('uppercases what it finds', () => {
    expect(initialsOf('joe alonzo')).toBe('JA')
  })
})

/**
 * The defensive read. **A malformed value is a first visit** — a state the app already knows what to
 * do with — so nothing is thrown and nothing is logged. The recoverable content of this key is a
 * name, and the recovery is one dialog.
 */
describe('T78 · readUserName', () => {
  it('reads the name out of a well-formed value', () => {
    expect(readUserName({ name: 'Joe Alonzo' })).toBe('Joe Alonzo')
  })

  it('trims what it reads', () => {
    expect(readUserName({ name: '  Joe Alonzo  ' })).toBe('Joe Alonzo')
  })

  it('repairs everything else to no name', () => {
    expect(readUserName(null)).toBe('')
    expect(readUserName(undefined)).toBe('')
    // A bare string was the other plausible shape for this key, and it is not the one we chose.
    expect(readUserName('joe')).toBe('')
    expect(readUserName([])).toBe('')
    expect(readUserName({})).toBe('')
    expect(readUserName({ name: 4 })).toBe('')
    expect(readUserName({ name: null })).toBe('')
    expect(readUserName({ name: '   ' })).toBe('')
  })

  it('names the key once, where the read is', () => {
    expect(USER_KEY).toBe('sticky-notes:user')
  })
})
