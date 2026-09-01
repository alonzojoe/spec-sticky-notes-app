import { describe, expect, it, vi } from 'vitest'

import { formatDate, isISODate, isoFromEpoch, todayISO } from '@/lib/dates'

// T38 — the decision this file exists to defend is in lib/dates.ts: nothing constructs a Date
// from a stored value, because `new Date('2026-09-01')` is parsed as UTC midnight by spec and
// renders as 31 August anywhere west of Greenwich.
describe('T38 · formatDate', () => {
  it('shows 2026-09-01 as 09/01/2026 — September the 1st, 2026', () => {
    expect(formatDate('2026-09-01')).toBe('09/01/2026')
  })

  it('keeps leading zeros on single-digit months and days', () => {
    expect(formatDate('2026-01-05')).toBe('01/05/2026')
    expect(formatDate('2026-12-31')).toBe('12/31/2026')
  })

  /**
   * The assertion that earns the decision. A `new Date(iso)` implementation returns the day
   * before in any negative-offset zone; a string-slicing one cannot. Asserted by behaviour
   * rather than by reading the source, so a future rewrite is caught too.
   */
  it('gives the same answer whatever the machine thinks the time is', () => {
    const answers = new Set<string>()
    for (const iso of ['2026-09-01T00:00:00Z', '2026-09-01T23:59:59Z', '2026-08-31T12:00:00Z']) {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(iso))
      answers.add(formatDate('2026-09-01'))
      vi.useRealTimers()
    }
    expect([...answers]).toEqual(['09/01/2026'])
  })
})

describe('T38 · todayISO', () => {
  it('reads the local calendar date, not the UTC one', () => {
    vi.useFakeTimers()
    // Late evening UTC — in a positive-offset zone the local date is already tomorrow, and in
    // a negative-offset one it is still today. Either way it must match what `Date` says
    // locally, never what toISOString() says.
    vi.setSystemTime(new Date('2026-09-01T22:30:00Z'))

    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`
    expect(todayISO()).toBe(expected)

    vi.useRealTimers()
  })

  it('is itself a valid ISO date', () => {
    expect(isISODate(todayISO())).toBe(true)
  })
})

describe('T38 · isISODate', () => {
  it.each([
    ['09/01/2026', 'display format'],
    ['2026-9-1', 'unpadded parts'],
    ['', 'empty'],
    ['not a date', 'prose'],
  ])('rejects %s (%s)', (value) => {
    expect(isISODate(value)).toBe(false)
  })

  it.each([[null], [undefined], [12345], [{}]])('rejects the non-string %s', (value) => {
    expect(isISODate(value)).toBe(false)
  })

  it('accepts a padded YYYY-MM-DD', () => {
    expect(isISODate('2026-09-01')).toBe(true)
  })
})

describe('T38 · isoFromEpoch', () => {
  it('agrees with todayISO for the current moment', () => {
    expect(isoFromEpoch(Date.now())).toBe(todayISO())
  })

  it('returns a valid ISO date for an arbitrary timestamp', () => {
    expect(isISODate(isoFromEpoch(1_700_000_000_000))).toBe(true)
  })
})
