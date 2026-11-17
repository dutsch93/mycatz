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

// Uhrzeit eines Zeitstempels (z. B. logged_at) in lokaler Zeit als "HH:MM".
export function timeOfDay(timestamp: string): string {
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Setzt Tag ("YYYY-MM-DD") und Uhrzeit ("HH:MM") in lokaler Zeit zu einem
// ISO-Zeitstempel zusammen — so wird eine bearbeitete Uhrzeit gespeichert.
export function combineDateAndTime(dateIso: string, time: string): string {
  const [y, m, d] = dateIso.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm).toISOString()
}

// Wochentag-Index mit Montag = 0 … Sonntag = 6 (JS liefert Sonntag = 0).
export function mondayIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}

// Füllt eine aufsteigende Liste von Tagen vorne mit null auf, damit der erste Tag
// in der richtigen Wochentag-Spalte (Mo–So) eines 7-Spalten-Rasters landet.
export function padToMondayGrid(dates: string[]): (string | null)[] {
  if (dates.length === 0) return []
  const lead: null[] = Array.from({ length: mondayIndex(dates[0]) }, () => null)
  return [...lead, ...dates]
}

// Kurzes Datum für Screenreader und Beschriftungen, z. B. "Di., 12. Nov.".
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
