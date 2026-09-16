import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildNfcShortcutUrl, isWebNfcSupported, NFC_QUERY_PARAM } from './nfc'

describe('NFC_QUERY_PARAM', () => {
  it('is the literal query string key "nfc"', () => {
    expect(NFC_QUERY_PARAM).toBe('nfc')
  })
})

describe('isWebNfcSupported', () => {
  afterEach(() => {
    // @ts-expect-error — Testdouble wieder entfernen
    delete window.NDEFReader
  })

  it('returns false when NDEFReader is not present on window (e.g. iOS Safari)', () => {
    expect(isWebNfcSupported()).toBe(false)
  })

  it('returns true when NDEFReader exists on window (e.g. Android Chrome)', () => {
    // @ts-expect-error — Testdouble für den Web-NFC-Konstruktor
    window.NDEFReader = vi.fn()
    expect(isWebNfcSupported()).toBe(true)
  })
})

describe('buildNfcShortcutUrl', () => {
  it('builds a URL pointing at the app root with the tag id as a query param', () => {
    const url = buildNfcShortcutUrl('abc123')
    expect(url).toBe(`${window.location.origin}/?nfc=abc123`)
  })

  it('URL-encodes special characters in the tag identifier', () => {
    const url = buildNfcShortcutUrl('tag with spaces&stuff')
    expect(url).toContain(encodeURIComponent('tag with spaces&stuff'))
    expect(url).not.toContain(' ')
  })
})
