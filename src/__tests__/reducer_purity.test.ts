import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const src = fileURLToPath(new URL('../', import.meta.url))
const reducer = readFileSync(`${src}context/notes_reducer.ts`, 'utf8')

/**
 * The reducer takes everything impure in its action payload, so that it is a function of its
 * arguments and its tests never need fake timers. notes_reducer.test.ts proves it does not
 * mutate; this proves it will not quietly acquire a clock in P5 or P8.
 */
describe('the reducer is pure', () => {
  it('actually read the reducer', () => {
    expect(reducer).toContain('export function notesReducer')
  })

  it.each(['Date.now', 'Math.random', 'crypto.randomUUID', "from 'react'"])(
    'contains no %s',
    (forbidden) => {
      expect(reducer).not.toContain(forbidden)
    },
  )
})
