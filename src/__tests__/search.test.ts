import { describe, expect, it } from 'vitest'

import { search } from '@/lib/search'
import type { Note } from '@/types/note'

const note = (over: Partial<Note> = {}): Note => ({
  id: 'a',
  title: '',
  body: '',
  link: '',
  color: 'butter',
  date: '2026-09-01',
  order: 1,
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

const ids = (hits: { note: Note }[]) => hits.map((hit) => hit.note.id)

// T57 — the matcher matches, ranks and excerpts.
describe('T57 · search · what matches', () => {
  it('finds a note by its title', () => {
    const hits = search([note({ id: 'a', title: 'Standup with the team' })], 'standup')

    expect(ids(hits)).toEqual(['a'])
    expect(hits[0].field).toBe('title')
  })

  it('finds a note by its body', () => {
    const hits = search([note({ id: 'a', body: 'went through the merge' })], 'merge')

    expect(ids(hits)).toEqual(['a'])
    expect(hits[0].field).toBe('body')
  })

  it('is case-insensitive in both directions', () => {
    const notes = [note({ id: 'a', title: 'STANDUP' }), note({ id: 'b', body: 'standup notes' })]

    expect(ids(search(notes, 'standup'))).toEqual(['a', 'b'])
    expect(ids(search(notes, 'STANDUP'))).toEqual(['a', 'b'])
  })

  it('does not match the link, the date or the colour', () => {
    const notes = [note({ id: 'a', link: 'https://meet.google.com/abc', date: '2026-09-01' })]

    expect(search(notes, 'meet')).toEqual([])
    expect(search(notes, 'google')).toEqual([])
    expect(search(notes, '2026')).toEqual([])
    expect(search(notes, 'butter')).toEqual([])
  })

  it('never matches an empty field', () => {
    // '' is a substring of every string, so a naive includes() would return every untitled note
    // for every query. This is the assertion that catches it.
    const hits = search([note({ id: 'a', title: '', body: '' })], 'anything')

    expect(hits).toEqual([])
  })

  it.each([[''], ['   '], ['\n'], ['\t  \n']])(
    'returns nothing for the empty query %j rather than everything',
    (query) => {
      const notes = [note({ id: 'a', title: 'Standup' }), note({ id: 'b', body: 'text' })]

      expect(search(notes, query)).toEqual([])
    },
  )

  // A RegExp built from user input throws on '(' — and this input is typed one character at a
  // time, so '(' is a state the field passes through on the way to anything parenthesised.
  it.each([['('], ['['], ['*'], ['\\'], ['a|b'], ['?']])(
    'treats the regex metacharacter %j as text rather than throwing',
    (query) => {
      const notes = [note({ id: 'a', body: 'a (parenthesised) thought [with] brackets' })]

      expect(() => search(notes, query)).not.toThrow()
    },
  )

  it('matches a metacharacter literally when the note contains it', () => {
    const hits = search([note({ id: 'a', body: 'a (parenthesised) thought' })], '(paren')

    expect(ids(hits)).toEqual(['a'])
  })
})

describe('T57 · search · how it ranks', () => {
  // The assertion that earns D3's ranking rule: searching "standup" should put the note NAMED
  // Standup above one that merely mentions standups, even when the board puts the other first.
  it('ranks a title hit above a body hit that is earlier on the board', () => {
    const notes = [
      note({ id: 'mentions', order: 9, body: 'the standup ran long' }),
      note({ id: 'named', order: 1, title: 'Standup' }),
    ]

    expect(ids(search(notes, 'standup'))).toEqual(['named', 'mentions'])
  })

  // Within a band the list and the grid agree on what "first" means — the same descending order
  // stamp the board sorts by.
  it('preserves board order within a band', () => {
    const notes = [
      note({ id: 'middle', order: 5, title: 'standup b' }),
      note({ id: 'last', order: 1, title: 'standup c' }),
      note({ id: 'first', order: 9, title: 'standup a' }),
    ]

    expect(ids(search(notes, 'standup'))).toEqual(['first', 'middle', 'last'])
  })

  it('returns a note once even when its title and body both match', () => {
    const notes = [note({ id: 'a', title: 'standup', body: 'the standup ran long' })]
    const hits = search(notes, 'standup')

    expect(hits).toHaveLength(1)
    expect(hits[0].field).toBe('title')
  })
})

describe('T57 · search · the excerpt', () => {
  it('windows around the match rather than showing the head of the body', () => {
    const body = `${'padding word '.repeat(40)}NEEDLE ${'trailing word '.repeat(40)}`
    const [hit] = search([note({ id: 'a', body })], 'needle')

    expect(hit.excerpt.toLowerCase()).toContain('needle')
    // A match 500 characters in must not produce the opening sentence — that explains nothing
    // about why the note matched.
    expect(hit.excerpt.startsWith('…')).toBe(true)
    expect(hit.excerpt.length).toBeLessThan(140)
  })

  it('does not lead with an ellipsis when the match is at the start', () => {
    const [hit] = search([note({ id: 'a', body: 'needle in the opening line' })], 'needle')

    expect(hit.excerpt.startsWith('…')).toBe(false)
    expect(hit.excerpt).toContain('needle')
  })

  it('uses the title as the excerpt source for a title hit', () => {
    const [hit] = search([note({ id: 'a', title: 'Standup', body: 'unrelated text' })], 'standup')

    expect(hit.excerpt).toContain('unrelated text')
  })

  it('gives a title-matched note with no body an empty excerpt rather than undefined', () => {
    const [hit] = search([note({ id: 'a', title: 'Standup', body: '' })], 'standup')

    expect(hit.excerpt).toBe('')
  })
})
