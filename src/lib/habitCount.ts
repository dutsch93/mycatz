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

// Ein Schritt zurück, falls man sich vertippt hat: 10+ → 10 → … → 0, nicht unter 0.
export function prevHabitCount(current: number | null | undefined): number {
  const value = Math.min(current ?? 0, HABIT_COUNT_MAX)
  return Math.max(value - 1, 0)
}
