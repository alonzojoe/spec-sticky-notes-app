// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import App from '@/app'
import { stubMatchMedia } from '@/__tests__/dom_setup'

beforeEach(() => stubMatchMedia())
afterEach(cleanup)

describe('the application shell', () => {
  it('renders exactly one main landmark for the board region', () => {
    render(<App />)
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })
})
