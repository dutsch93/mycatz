import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPushSupported, normalizeReminderTimes, urlBase64ToUint8Array } from './pushNotifications'

describe('isPushSupported', () => {
  afterEach(() => {
    // @ts-expect-error — Testdoubles wieder entfernen
    delete window.PushManager
    // @ts-expect-error — Testdoubles wieder entfernen
    delete window.Notification
    // jsdom kennt navigator.serviceWorker von Haus aus nicht — Testdouble entfernen,
    // falls im jeweiligen Test gesetzt.
    // @ts-expect-error — Testdouble wieder entfernen
    delete navigator.serviceWorker
  })

  it('returns false when PushManager/Notification/serviceWorker are not present (e.g. iOS Safari < 16.4)', () => {
    expect(isPushSupported()).toBe(false)
  })

  it('returns true when serviceWorker, PushManager and Notification all exist', () => {
    // jsdom implementiert serviceWorker nicht selbst — per defineProperty nachbauen,
    // da navigator ein Read-only-Objekt ohne direkten Property-Assign ist.
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    // @ts-expect-error — Testdouble
    window.PushManager = vi.fn()
    // @ts-expect-error — Testdouble
    window.Notification = vi.fn()
    expect(isPushSupported()).toBe(true)
  })
})

describe('urlBase64ToUint8Array', () => {
  it('round-trips bytes through URL-safe base64 encoding and decoding', () => {
    const bytes = [0, 1, 2, 255, 128, 16]
    const standard = btoa(String.fromCharCode(...bytes))
    const urlSafe = standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(Array.from(urlBase64ToUint8Array(urlSafe))).toEqual(bytes)
  })

  it('converts URL-safe characters (- and _) back to standard base64 correctly', () => {
    const bytes = [251, 239, 190] // ergibt Standard-Base64 mit + und /
    const standard = btoa(String.fromCharCode(...bytes))
    expect(standard).toMatch(/[+/]/)
    const urlSafe = standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(Array.from(urlBase64ToUint8Array(urlSafe))).toEqual(bytes)
  })
})

describe('normalizeReminderTimes', () => {
  it('kürzt Postgres-Zeiten mit Sekunden auf HH:MM', () => {
    expect(normalizeReminderTimes(['08:00:00', '18:30:00'])).toEqual(['08:00', '18:30'])
  })

  it('entfernt leere, ungültige und doppelte Einträge und sortiert', () => {
    expect(normalizeReminderTimes(['18:00', '', '25:00', '08:00', '18:00', 'abc'])).toEqual([
      '08:00',
      '18:00',
    ])
  })
})
