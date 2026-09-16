import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayNumber,
  formatLongDate,
  lastDays,
  lastMonths,
  monthShortLabel,
  toIsoDate,
  weekdayShort,
} from './dates'

describe('toIsoDate', () => {
  it('formats a Date as YYYY-MM-DD with zero-padding', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('pads single-digit months and days', () => {
    expect(toIsoDate(new Date(2026, 8, 9))).toBe('2026-09-09')
  })
})

describe('addDays', () => {
  it('adds positive days within the same month', () => {
    expect(addDays('2026-09-10', 3)).toBe('2026-09-13')
  })

  it('subtracts days across a month boundary', () => {
    expect(addDays('2026-09-02', -5)).toBe('2026-08-28')
  })

  it('rolls over into the next year', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('returns the same date when adding zero days', () => {
    expect(addDays('2026-09-16', 0)).toBe('2026-09-16')
  })
})

describe('weekdayShort', () => {
  it('returns the correct German weekday abbreviation', () => {
    // 2026-09-16 ist ein Mittwoch
    expect(weekdayShort('2026-09-16')).toBe('Mi')
  })

  it('recognizes Sunday correctly (edge case: getDay() === 0)', () => {
    // 2026-09-20 ist ein Sonntag
    expect(weekdayShort('2026-09-20')).toBe('So')
  })
})

describe('dayNumber', () => {
  it('extracts the day-of-month as a number', () => {
    expect(dayNumber('2026-09-05')).toBe(5)
  })

  it('does not keep leading zeros', () => {
    expect(dayNumber('2026-09-05')).not.toBe('05')
  })
})

describe('formatLongDate', () => {
  it('formats a date in long German form', () => {
    expect(formatLongDate('2026-09-16')).toContain('16.')
    expect(formatLongDate('2026-09-16')).toContain('September')
  })
})

describe('lastDays', () => {
  it('returns the requested number of days, oldest first', () => {
    const days = lastDays('2026-09-16', 3)
    expect(days).toEqual(['2026-09-14', '2026-09-15', '2026-09-16'])
  })

  it('includes the center date as the last entry', () => {
    const days = lastDays('2026-09-16', 7)
    expect(days[days.length - 1]).toBe('2026-09-16')
  })

  it('returns an empty array for count 0', () => {
    expect(lastDays('2026-09-16', 0)).toEqual([])
  })
})

describe('lastMonths', () => {
  it('returns the requested number of distinct month keys', () => {
    const months = lastMonths(3)
    expect(months).toHaveLength(3)
    expect(new Set(months).size).toBe(3)
  })

  it('returns months in YYYY-MM format, oldest first', () => {
    const months = lastMonths(2)
    for (const m of months) expect(m).toMatch(/^\d{4}-\d{2}$/)
    expect(months[0] < months[1]).toBe(true)
  })
})

describe('monthShortLabel', () => {
  it('formats a YYYY-MM key as a short German month name', () => {
    expect(monthShortLabel('2026-09')).toContain('Sep')
  })
})
