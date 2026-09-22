import { lastDays, todayIso } from '../../lib/dates'
import type { HabitDefinition, HabitLog } from '../../types'
import GlassCard from './GlassCard'

// Kompaktes Dichte-Raster für Gesundheits-Events (habit_logs mit category='health').
// Zeigt nur so viele Tage, wie im aktuell geladenen Stats-Zeitraum (`days`) tatsächlich
// abgefragt wurden — sonst würden Tage außerhalb des Fensters fälschlich leer wirken.
export default function HealthHeatmap({
  habitLogs,
  habits,
  days,
}: {
  habitLogs: HabitLog[]
  habits: HabitDefinition[]
  days: number
}) {
  const windowDays = Math.min(days, 35)
  if (windowDays < 7) return null

  const healthHabitIds = new Set(
    habits.filter((h) => h.category === 'health').map((h) => h.id),
  )

  const countByDate = new Map<string, number>()
  for (const log of habitLogs) {
    if (!healthHabitIds.has(log.habit_id) || log.value !== true) continue
    countByDate.set(log.date, (countByDate.get(log.date) ?? 0) + 1)
  }

  const dates = lastDays(todayIso(), windowDays)
  const maxCount = Math.max(1, ...Array.from(countByDate.values()))

  function densityStyle(count: number) {
    if (count === 0) return { background: 'var(--bg-input)' }
    const opacity = 0.25 + 0.75 * (count / maxCount)
    return { background: `rgba(201, 124, 124, ${opacity})` }
  }

  return (
    <GlassCard className="p-3">
      <div className="grid grid-cols-7 gap-1">
        {dates.map((date) => (
          <div
            key={date}
            title={`${date}: ${countByDate.get(date) ?? 0} Gesundheits-Event(s)`}
            className="aspect-square rounded-md"
            style={densityStyle(countByDate.get(date) ?? 0)}
          />
        ))}
      </div>
      <p className="text-[11px] text-text-secondary mt-2">
        Dichte = Anzahl Gesundheits-Einträge pro Tag (letzte {windowDays} Tage)
      </p>
    </GlassCard>
  )
}
