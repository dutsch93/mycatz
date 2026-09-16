// Kleine Datumshilfen. Wir rechnen überall mit "YYYY-MM-DD" Strings (lokale Zeit),
// weil die Supabase-Spalte `date` genau dieses Format erwartet.

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export function toIsoDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

export function addDays(iso: string, amount: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + amount)
  return toIsoDate(date)
}

export function weekdayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return WOCHENTAGE[new Date(y, m - 1, d).getDay()]
}

export function dayNumber(iso: string): number {
  return Number(iso.split('-')[2])
}

export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })
}

// Die letzten `count` Tage bis einschließlich `centerIso`, älteste zuerst.
export function lastDays(centerIso: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(centerIso, i - (count - 1)))
}

// Die letzten `count` Monate bis einschließlich dem aktuellen, als "YYYY-MM", älteste zuerst.
export function lastMonths(count: number): string[] {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

export function monthShortLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'short' })
}
