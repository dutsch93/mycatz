import { formatShortDate, lastDays, padToMondayGrid, todayIso } from '../../lib/dates'
import type { HabitDefinition, HabitLog } from '../../types'
import GlassCard from './GlassCard'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// Kompaktes Dichte-Raster für Gesundheits-Events (habit_logs mit category='health').
// Zeigt nur so viele Tage, wie im aktuell geladenen Stats-Zeitraum (`days`) tatsächlich
// abgefragt wurden — sonst würden Tage außerhalb des Fensters fälschlich leer wirken.
//
// Barrierefreiheit (Apple-HIG: "Convey information with more than color alone"):
// - Spalten sind feste Wochentage (Mo–So) mit Kopfzeile, nicht "irgendwelche" 7 Tage
// - Kästchen mit Einträgen zeigen die Anzahl als Zahl, nicht nur als Farbintensität
// - Jedes Kästchen hat ein aria-label, das Ganze eine Zusammenfassung für VoiceOver
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
  const cells = padToMondayGrid(dates)
  const maxCount = Math.max(1, ...Array.from(countByDate.values()))

  // Zusammenfassung in einem Satz — das, was man aus dem Raster ablesen soll
  const daysWithEvents = dates.filter((d) => (countByDate.get(d) ?? 0) > 0)
  const lastEventDate = daysWithEvents[daysWithEvents.length - 1]
  const summary =
    daysWithEvents.length === 0
      ? `Keine Gesundheits-Einträge in den letzten ${windowDays} Tagen.`
      : `An ${daysWithEvents.length} von ${windowDays} Tagen Gesundheits-Einträge, zuletzt am ${formatShortDate(lastEventDate)}.`

  function densityStyle(count: number) {
    if (count === 0) return { background: 'var(--bg-input)' }
    const opacity = 0.25 + 0.75 * (count / maxCount)
    return { background: `rgba(201, 124, 124, ${opacity})` }
  }

  return (
    <GlassCard className="p-3">
      <p className="text-[13px] text-text-primary mb-2">{summary}</p>

      {/* Für VoiceOver: Zusammenfassung oben als Text, danach jedes Kästchen einzeln
          mit Datum und Anzahl. Die Wochentags-Kopfzeile ist rein visuell. */}
      <div role="group" aria-label="Gesundheits-Einträge pro Tag">
        <div className="grid grid-cols-7 gap-1 mb-1" aria-hidden="true">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-[11px] text-text-secondary text-center">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`leer-${i}`} aria-hidden="true" />
            const count = countByDate.get(date) ?? 0
            return (
              <div
                key={date}
                role="img"
                aria-label={`${formatShortDate(date)}: ${
                  count === 0 ? 'keine' : count
                } Gesundheits-${count === 1 ? 'Eintrag' : 'Einträge'}`}
                className="aspect-square rounded-md flex items-center justify-center text-[11px] text-text-primary tabular-nums"
                style={densityStyle(count)}
              >
                {count > 0 ? count : ''}
              </div>
            )
          })}
        </div>
      </div>
    </GlassCard>
  )
}
