import { describe, expect, it } from 'vitest'
import { computeWeeklyPlayInsight } from './insights'
import type { PlayLog } from '../types'

function makeLog(overrides: Partial<PlayLog>): PlayLog {
  return {
    id: overrides.id ?? 'log-1',
    cat_id: 'cat-1',
    duration_min: 10,
    logged_by: null,
    logged_at: '2026-09-16T10:00:00Z',
    date: '2026-09-16',
    note: null,
    ...overrides,
  }
}

describe('computeWeeklyPlayInsight', () => {
  const today = '2026-09-16' // aktuelle 7-Tage-Periode: 2026-09-10 .. 2026-09-16

  it('returns a positive percent delta when this week is higher than last week', () => {
    const logs = [
      makeLog({ id: 'a', date: '2026-09-16', duration_min: 20 }), // aktuelle Woche: 20
      makeLog({ id: 'b', date: '2026-09-09', duration_min: 10 }), // Vorwoche: 10
    ]
    expect(computeWeeklyPlayInsight(logs, today)).toBe(100)
  })

  it('returns a negative percent delta when this week is lower than last week', () => {
    const logs = [
      makeLog({ id: 'a', date: '2026-09-16', duration_min: 5 }),
      makeLog({ id: 'b', date: '2026-09-09', duration_min: 10 }),
    ]
    expect(computeWeeklyPlayInsight(logs, today)).toBe(-50)
  })

  it('returns 0 when both weeks are equal', () => {
    const logs = [
      makeLog({ id: 'a', date: '2026-09-16', duration_min: 15 }),
      makeLog({ id: 'b', date: '2026-09-09', duration_min: 15 }),
    ]
    expect(computeWeeklyPlayInsight(logs, today)).toBe(0)
  })

  it('returns null when the previous week has 0 minutes (no divide-by-zero)', () => {
    const logs = [makeLog({ id: 'a', date: '2026-09-16', duration_min: 20 })]
    expect(computeWeeklyPlayInsight(logs, today)).toBeNull()
  })

  it('returns null when both weeks have 0 minutes', () => {
    expect(computeWeeklyPlayInsight([], today)).toBeNull()
  })

  it('ignores logs outside both 7-day windows', () => {
    const logs = [
      makeLog({ id: 'a', date: '2026-09-16', duration_min: 20 }),
      makeLog({ id: 'b', date: '2026-09-09', duration_min: 10 }),
      makeLog({ id: 'c', date: '2026-08-01', duration_min: 999 }), // außerhalb, ignorieren
    ]
    expect(computeWeeklyPlayInsight(logs, today)).toBe(100)
  })

  it('rounds the percent delta to a whole number', () => {
    const logs = [
      makeLog({ id: 'a', date: '2026-09-16', duration_min: 10 }),
      makeLog({ id: 'b', date: '2026-09-09', duration_min: 3 }),
    ]
    // (10-3)/3 * 100 = 233.33... -> 233
    expect(computeWeeklyPlayInsight(logs, today)).toBe(233)
  })
})
