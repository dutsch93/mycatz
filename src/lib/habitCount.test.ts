import { describe, expect, it } from 'vitest'
import { formatHabitCount, nextHabitCount } from './habitCount'

describe('nextHabitCount', () => {
  it('startet bei fehlendem Wert mit 1', () => {
    expect(nextHabitCount(undefined)).toBe(1)
    expect(nextHabitCount(null)).toBe(1)
  })

  it('zählt um eins hoch', () => {
    expect(nextHabitCount(0)).toBe(1)
    expect(nextHabitCount(9)).toBe(10)
  })

  it('geht nach 10 auf 10+ und danach wieder auf 0', () => {
    expect(nextHabitCount(10)).toBe(11)
    expect(nextHabitCount(11)).toBe(0)
  })

  it('setzt alte Werte über 10+ ebenfalls auf 0 zurück', () => {
    expect(nextHabitCount(25)).toBe(0)
  })
})

describe('formatHabitCount', () => {
  it('zeigt 0 bei fehlendem Wert', () => {
    expect(formatHabitCount(undefined)).toBe('0')
  })

  it('zeigt Zahlen bis 10 direkt an', () => {
    expect(formatHabitCount(7)).toBe('7')
    expect(formatHabitCount(10)).toBe('10')
  })

  it('zeigt ab 11 "10+" an', () => {
    expect(formatHabitCount(11)).toBe('10+')
    expect(formatHabitCount(30)).toBe('10+')
  })
})
