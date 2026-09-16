import { describe, expect, it } from 'vitest'
import { computeStreak, healthEventLabel } from './streaks'
import type { HabitDefinition, HabitLog } from '../types'

function makeLog(overrides: Partial<HabitLog>): HabitLog {
  return {
    id: overrides.id ?? 'log-1',
    cat_id: 'cat-1',
    habit_id: 'habit-1',
    date: '2026-09-16',
    value: true,
    count: null,
    selected_option: null,
    note: null,
    logged_by: null,
    logged_at: '2026-09-16T10:00:00Z',
    ...overrides,
  }
}

describe('computeStreak', () => {
  it('returns 0 when there are no logs for the habit', () => {
    expect(computeStreak('habit-1', [], '2026-09-16')).toBe(0)
  })

  it('counts a single day streak when only today is logged true', () => {
    const logs = [makeLog({ date: '2026-09-16', value: true })]
    expect(computeStreak('habit-1', logs, '2026-09-16')).toBe(1)
  })

  it('counts consecutive true days going backwards from today', () => {
    const logs = [
      makeLog({ id: 'a', date: '2026-09-16', value: true }),
      makeLog({ id: 'b', date: '2026-09-15', value: true }),
      makeLog({ id: 'c', date: '2026-09-14', value: true }),
    ]
    expect(computeStreak('habit-1', logs, '2026-09-16')).toBe(3)
  })

  it('stops the streak at the first false day', () => {
    const logs = [
      makeLog({ id: 'a', date: '2026-09-16', value: true }),
      makeLog({ id: 'b', date: '2026-09-15', value: false }),
      makeLog({ id: 'c', date: '2026-09-14', value: true }),
    ]
    expect(computeStreak('habit-1', logs, '2026-09-16')).toBe(1)
  })

  it('stops the streak at a gap day with no log at all', () => {
    const logs = [
      makeLog({ id: 'a', date: '2026-09-16', value: true }),
      // 2026-09-15 fehlt komplett
      makeLog({ id: 'c', date: '2026-09-14', value: true }),
    ]
    expect(computeStreak('habit-1', logs, '2026-09-16')).toBe(1)
  })

  it('does not break the streak because today has not been logged yet', () => {
    const logs = [
      makeLog({ id: 'a', date: '2026-09-15', value: true }),
      makeLog({ id: 'b', date: '2026-09-14', value: true }),
    ]
    expect(computeStreak('habit-1', logs, '2026-09-16')).toBe(2)
  })

  it('returns 0 when today is unlogged and yesterday was false', () => {
    const logs = [makeLog({ date: '2026-09-15', value: false })]
    expect(computeStreak('habit-1', logs, '2026-09-16')).toBe(0)
  })

  it('ignores logs belonging to a different habit', () => {
    const logs = [makeLog({ habit_id: 'other-habit', date: '2026-09-16', value: true })]
    expect(computeStreak('habit-1', logs, '2026-09-16')).toBe(0)
  })
})

describe('healthEventLabel', () => {
  const countHabit: HabitDefinition = {
    id: 'h1',
    household_id: 'hh1',
    name: 'Erbrochen',
    emoji: '🤮',
    type: 'count',
    options: null,
    has_required_count: false,
    is_default: true,
    sort_order: 0,
    category: 'health',
    created_at: '2026-01-01T00:00:00Z',
  }

  const booleanHabit: HabitDefinition = { ...countHabit, type: 'boolean', name: 'Tierarztbesuch' }

  const selectHabit: HabitDefinition = {
    ...countHabit,
    type: 'select',
    name: 'Stimmung',
    options: ['entspannt', 'ängstlich'],
  }

  it('formats a count habit as "<count>× <name>"', () => {
    const log = makeLog({ habit_id: 'h1', count: 2 })
    expect(healthEventLabel(countHabit, log)).toBe('2× Erbrochen')
  })

  it('formats a boolean habit as just the name', () => {
    const log = makeLog({ habit_id: 'h1', value: true })
    expect(healthEventLabel(booleanHabit, log)).toBe('Tierarztbesuch')
  })

  it('formats a select habit as "<name>: <option>"', () => {
    const log = makeLog({ habit_id: 'h1', selected_option: 'ängstlich' })
    expect(healthEventLabel(selectHabit, log)).toBe('Stimmung: ängstlich')
  })

  it('falls back to just the name when a count habit has no count', () => {
    const log = makeLog({ habit_id: 'h1', count: null })
    expect(healthEventLabel(countHabit, log)).toBe('Erbrochen')
  })
})
