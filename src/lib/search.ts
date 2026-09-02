import type { Note } from '@/types/note'

/**
 * The whole of the search, as one pure function over an array already in memory. There is no
 * index, no worker and no debounce — a personal board is a few hundred notes at most, and
 * `includes` over that is faster than the keystroke that triggered it.
 *
 * **No `RegExp` is ever built from the query.** `new RegExp('(')` throws, and a live search field
 * passes through `(` on the way to anything parenthesised — so the crash is one keystroke away
 * rather than hypothetical. Both sides are lowercased once and compared with `includes`.
 */

export interface Hit {
  note: Note
  /** Which field the query hit. Decides the ranking band and where the excerpt comes from. */
  field: 'title' | 'body'
  /** A window around the match in the body, or `''` when the note has no body. */
  excerpt: string
}

/** Roughly a line and a half of the card's type. Long enough to recognise, short enough to scan. */
const EXCERPT_LENGTH = 80
/** How much of the window sits before the match, so the hit is not flush against the ellipsis. */
const LEAD = 24

/**
 * A window around the first occurrence, cut on a word boundary when one is close.
 *
 * Showing the head of the body instead is the obvious implementation and the wrong one: a note
 * matched on a word 400 characters in would show an opening sentence that explains nothing about
 * why it matched.
 */
const excerptAround = (body: string, needle: string): string => {
  if (body === '') return ''

  const at = needle === '' ? -1 : body.toLowerCase().indexOf(needle)
  // A title hit still shows the body — there is no match in it to window around, so the opening
  // is the right thing to show.
  const rawStart = at === -1 ? 0 : Math.max(0, at - LEAD)

  // Nudge to the next word boundary so the excerpt does not begin mid-word, but only when one is
  // near — otherwise a long unbroken string would eat the match itself.
  const space = body.indexOf(' ', rawStart)
  const start = rawStart > 0 && space !== -1 && space - rawStart < 12 ? space + 1 : rawStart

  const window = body.slice(start, start + EXCERPT_LENGTH).trimEnd()
  const prefix = start > 0 ? '…' : ''
  const suffix = start + EXCERPT_LENGTH < body.length ? '…' : ''
  return `${prefix}${window}${suffix}`
}

/**
 * Matching notes, title hits first.
 *
 * Two bands rather than a score: a note *named* Standup should beat one that mentions standups in
 * passing, and that is the only ranking judgement this app has any basis for making. Within a band
 * the board's own descending `order` is preserved, so the list and the grid agree on what "first"
 * means — the palette reads as an index into the board rather than as a different app.
 */
export const search = (notes: Note[], query: string): Hit[] => {
  const needle = query.trim().toLowerCase()
  // An empty query returns nothing, not everything. The palette shows its prompt instead, and
  // `''` is a substring of every string — a missing guard here matches every note in the board.
  if (needle === '') return []

  const byOrder = [...notes].sort((a, b) => b.order - a.order)

  const titles: Hit[] = []
  const bodies: Hit[] = []

  for (const note of byOrder) {
    // An empty field cannot match. Checked explicitly rather than relying on the query being
    // non-empty, so the intent survives someone changing the guard above.
    if (note.title !== '' && note.title.toLowerCase().includes(needle)) {
      titles.push({ note, field: 'title', excerpt: excerptAround(note.body, needle) })
      // Never twice. A note whose title and body both match is one result, ranked by its title.
      continue
    }
    if (note.body !== '' && note.body.toLowerCase().includes(needle)) {
      bodies.push({ note, field: 'body', excerpt: excerptAround(note.body, needle) })
    }
  }

  return [...titles, ...bodies]
}
