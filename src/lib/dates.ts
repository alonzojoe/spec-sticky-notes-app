/**
 * A note's date is a calendar date: no time, no zone. It is stored as `YYYY-MM-DD` because
 * that sorts lexically, is unambiguous, and is what a date input reads and writes. It is shown
 * as `MM/DD/YYYY` because that is what the board asks for — `09/01/2026` is 1 September 2026.
 *
 * **Nothing here constructs a Date from a stored value, and that is the whole point.**
 * `new Date('2026-09-01')` is parsed as UTC midnight by spec, so anywhere west of Greenwich it
 * renders as 31 August. The bug is invisible to whoever writes it in a UTC-ish timezone and
 * obvious to everyone else. Formatting is string slicing; "today" is read off the local
 * components of a live clock, never off `toISOString()`, which is UTC for the same reason.
 */

const pad = (value: number) => String(value).padStart(2, '0')

/** Today, as the local calendar sees it. */
export const todayISO = (): string => isoFromDate(new Date())

/** The local calendar date of an epoch timestamp — used to date notes saved before P6. */
export const isoFromEpoch = (ms: number): string => isoFromDate(new Date(ms))

const isoFromDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** `YYYY-MM-DD` and nothing else. Rejects display format, unpadded parts, and non-strings. */
export const isISODate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

/** `'2026-09-01'` to `'09/01/2026'`. Pure string work — see the note above. */
export const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split('-')
  return `${month}/${day}/${year}`
}

/** The Date a calendar component needs, built from local components so it lands on the right day. */
export const dateFromISO = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** The inverse, for reading a calendar's selection back out. */
export const isoFromLocalDate = (date: Date): string => isoFromDate(date)
