import { describe, expect, it } from 'vitest'

import { isSafeLink, linkLabel, normalizeLink } from '@/lib/links'

// T48 — the link helpers are correct, and refuse what they should.
//
// The refusal block is the one that earns the decision in requirements § D4. Every string in it
// reaches an href if the check is a regex or a denylist of scheme names, and none of them survive
// an allowlist of exactly two schemes.
describe('T48 · normalizeLink', () => {
  it('prefixes a bare host with https', () => {
    expect(normalizeLink('meet.google.com/abc-defg-hij')).toBe('https://meet.google.com/abc-defg-hij')
  })

  it('leaves a string that already carries a scheme alone', () => {
    expect(normalizeLink('https://example.com')).toBe('https://example.com')
    expect(normalizeLink('http://example.com')).toBe('http://example.com')
  })

  it('trims before it looks at anything', () => {
    expect(normalizeLink('  meet.google.com/abc  ')).toBe('https://meet.google.com/abc')
  })

  it('refuses every scheme that is not http or https', () => {
    expect(normalizeLink('javascript:alert(1)')).toBe('')
    expect(normalizeLink('JavaScript:alert(1)')).toBe('')
    expect(normalizeLink('  javascript:alert(1)')).toBe('')
    expect(normalizeLink('data:text/html,<script>alert(1)</script>')).toBe('')
    expect(normalizeLink('vbscript:msgbox(1)')).toBe('')
    expect(normalizeLink('file:///etc/passwd')).toBe('')
    expect(normalizeLink('mailto:a@b.c')).toBe('')
    expect(normalizeLink('tel:5551234')).toBe('')
  })

  it('gives an empty string for anything that is not a link', () => {
    expect(normalizeLink('')).toBe('')
    expect(normalizeLink('   ')).toBe('')
    expect(normalizeLink('not a url')).toBe('')
    expect(normalizeLink('https://')).toBe('')
  })
})

describe('T48 · isSafeLink', () => {
  it('accepts http and https', () => {
    expect(isSafeLink('https://example.com')).toBe(true)
    expect(isSafeLink('http://example.com/a/b?c=d#e')).toBe(true)
  })

  // The two boundaries must not drift apart: normalizeLink guards the input path and isSafeLink
  // guards the storage path, and a value the first refuses must not be one the second allows.
  it('agrees with normalizeLink on everything it refuses', () => {
    const refused = [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,<script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'mailto:a@b.c',
      'tel:5551234',
      'not a url',
      '',
    ]
    refused.forEach((value) => {
      expect(isSafeLink(value)).toBe(false)
      expect(normalizeLink(value)).toBe('')
    })
  })

  it('does not accept a bare host, which has no scheme yet', () => {
    expect(isSafeLink('meet.google.com/abc')).toBe(false)
  })
})

describe('T48 · linkLabel', () => {
  it('strips the scheme', () => {
    expect(linkLabel('https://meet.google.com/abc-defg-hij')).toBe('meet.google.com/abc-defg-hij')
    expect(linkLabel('http://example.com/a')).toBe('example.com/a')
  })

  it('strips a leading www but keeps the query and the hash', () => {
    expect(linkLabel('https://www.figma.com/file/x?node=1')).toBe('figma.com/file/x?node=1')
    expect(linkLabel('https://example.com/a#b')).toBe('example.com/a#b')
  })

  it('drops a trailing slash on a bare host, which reads as a typo', () => {
    expect(linkLabel('https://example.com/')).toBe('example.com')
  })

  it('gives an empty string for an empty link', () => {
    expect(linkLabel('')).toBe('')
  })
})
