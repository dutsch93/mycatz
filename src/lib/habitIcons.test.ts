import { describe, expect, it } from 'vitest'
import {
  Heart,
  Paintbrush,
  Trash2,
  Scissors,
  Pill,
  Droplet,
  Smile,
  TriangleAlert,
  Droplets,
  Wind,
  CircleDashed,
  MapPin,
  Stethoscope,
  CircleHelp,
} from 'lucide-react'
import { resolveHabitIcon } from './habitIcons'

describe('resolveHabitIcon', () => {
  const cases: [string, unknown][] = [
    ['Gekuschelt', Heart],
    ['Gebürstet', Paintbrush],
    ['Katzenklo gereinigt', Trash2],
    ['Krallen geschnitten', Scissors],
    ['Medikament gegeben', Pill],
    ['Trinkmenge', Droplet],
    ['Stimmung', Smile],
    ['Erbrochen', TriangleAlert],
    ['Durchfall', Droplets],
    ['Niesen', Wind],
    ['Haarballen', CircleDashed],
    ['Markiert / Angepinkelt', MapPin],
    ['Tierarztbesuch', Stethoscope],
    ['Ungewöhnl. Verhalten', TriangleAlert],
  ]

  it.each(cases)('maps "%s" to the correct Lucide icon', (name, expected) => {
    expect(resolveHabitIcon(name)).toBe(expected)
  })

  it('returns the fallback icon for an unknown/custom habit name', () => {
    expect(resolveHabitIcon('Frei erfundener Habit')).toBe(CircleHelp)
  })

  it('matches case-insensitively', () => {
    expect(resolveHabitIcon('gekuschelt')).toBe(Heart)
    expect(resolveHabitIcon('GEKUSCHELT')).toBe(Heart)
  })

  it('trims surrounding whitespace before matching', () => {
    expect(resolveHabitIcon('  Gekuschelt  ')).toBe(Heart)
  })

  it('does not throw for an empty string', () => {
    expect(resolveHabitIcon('')).toBe(CircleHelp)
  })
})
