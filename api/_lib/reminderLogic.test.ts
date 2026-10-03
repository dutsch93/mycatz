import { describe, expect, it } from 'vitest'
import { berlinDateString, getDueTimes, shouldSendReminder } from './reminderLogic'

describe('getDueTimes', () => {
  it('returns a time that falls exactly on the current minute', () => {
    const now = new Date('2026-10-03T06:00:00Z') // 08:00 Berlin (CEST, UTC+2)
    expect(getDueTimes(['08:00', '18:00'], now)).toEqual(['08:00'])
  })

  it('returns a time within the window shortly after the exact minute', () => {
    const now = new Date('2026-10-03T06:04:00Z') // 08:04 Berlin
    expect(getDueTimes(['08:00'], now)).toEqual(['08:00'])
  })

  it('does not return a time once the window has passed', () => {
    const now = new Date('2026-10-03T06:05:00Z') // 08:05 Berlin, Fenster ist 5 Min exklusiv
    expect(getDueTimes(['08:00'], now)).toEqual([])
  })

  it('does not return a time that has not arrived yet', () => {
    const now = new Date('2026-10-03T05:59:00Z') // 07:59 Berlin
    expect(getDueTimes(['08:00'], now)).toEqual([])
  })

  it('returns multiple due times when several configured times fall in the window', () => {
    const now = new Date('2026-10-03T06:02:00Z') // 08:02 Berlin
    expect(getDueTimes(['08:00', '08:01', '09:00'], now)).toEqual(['08:00', '08:01'])
  })
})

describe('shouldSendReminder', () => {
  it('sends when neither already fed nor already sent', () => {
    expect(shouldSendReminder({ alreadyFedToday: false, alreadySentSlot: false })).toBe(true)
  })

  it('does not send when already fed today', () => {
    expect(shouldSendReminder({ alreadyFedToday: true, alreadySentSlot: false })).toBe(false)
  })

  it('does not send when this slot was already sent', () => {
    expect(shouldSendReminder({ alreadyFedToday: false, alreadySentSlot: true })).toBe(false)
  })
})

describe('berlinDateString', () => {
  it('formats a UTC date as YYYY-MM-DD in the Europe/Berlin calendar day', () => {
    // 2026-10-03T23:30:00Z ist in Berlin (UTC+2, CEST) bereits 2026-10-04 01:30
    expect(berlinDateString(new Date('2026-10-03T23:30:00Z'))).toBe('2026-10-04')
  })
})
