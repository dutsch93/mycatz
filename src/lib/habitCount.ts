// Zähl-Habits (z. B. "Erbrochen") werden per Tippen hochgezählt statt eingetippt:
// 0 → 1 → … → 10 → 10+ → wieder 0. "10+" wird als Zahl 11 gespeichert.

export const HABIT_COUNT_MAX = 11 // entspricht "10+"

export function nextHabitCount(current: number | null | undefined): number {
  const value = current ?? 0
  return value >= HABIT_COUNT_MAX ? 0 : value + 1
}

export function formatHabitCount(count: number | null | undefined): string {
  const value = count ?? 0
  return value >= HABIT_COUNT_MAX ? '10+' : String(value)
}
