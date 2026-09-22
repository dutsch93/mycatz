import { addDays, lastDays } from './dates'
import type { PlayLog } from '../types'

// Vergleicht die Spielzeit-Summe der aktuellen 7-Tage-Periode mit der davor
// liegenden 7-Tage-Periode. Gibt das Prozent-Delta zurück, oder `null` wenn
// die Vorwoche 0 Minuten hat (kein Divide-by-Zero, keine sinnvolle Aussage).
export function computeWeeklyPlayInsight(logs: PlayLog[], today: string): number | null {
  const currentDays = new Set(lastDays(today, 7))
  const previousDays = new Set(lastDays(addDays(today, -7), 7))

  const currentTotal = logs
    .filter((l) => currentDays.has(l.date))
    .reduce((sum, l) => sum + l.duration_min, 0)
  const previousTotal = logs
    .filter((l) => previousDays.has(l.date))
    .reduce((sum, l) => sum + l.duration_min, 0)

  if (previousTotal === 0) return null

  return Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
}
