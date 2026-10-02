import { useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useStats } from '../../hooks/useStats'
import { lastDays, todayIso } from '../../lib/dates'
import GlassCard from './GlassCard'

// Sparklines der letzten 7 Tage (Futter- und Spielzeit-Logs) der aktuell ausgewählten
// Katze/Gruppe. Nutzt useStats (bereits vorhanden, gleiches Muster wie Stats.tsx) statt
// eines neuen Endpoints — reine Client-seitige Aggregation.
export default function WeekTrendTile({ catIds }: { catIds: string[] }) {
  const { feedingLogs, playLogs, loading } = useStats(catIds, 'week')

  const foodData = useMemo(() => {
    const days = lastDays(todayIso(), 7)
    return days.map((day) => ({
      day,
      grams: feedingLogs.filter((l) => l.date === day).reduce((sum, l) => sum + l.amount_g, 0),
    }))
  }, [feedingLogs])

  const playData = useMemo(() => {
    const days = lastDays(todayIso(), 7)
    return days.map((day) => ({
      day,
      minutes: playLogs.filter((l) => l.date === day).reduce((sum, l) => sum + l.duration_min, 0),
    }))
  }, [playLogs])

  if (catIds.length === 0) return null

  const foodTotal = foodData.reduce((sum, d) => sum + d.grams, 0)
  const playTotal = playData.reduce((sum, d) => sum + d.minutes, 0)

  return (
    <GlassCard className="p-3 mt-3">
      <p className="text-[13px] text-text-secondary mb-1">Trend (7 Tage)</p>
      {loading ? (
        <p className="text-[13px] text-text-secondary py-4">Lädt…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--color-sage)' }}>
              Futter
            </p>
            {foodTotal === 0 ? (
              <p className="text-[13px] text-text-secondary py-2">Noch keine Daten diese Woche.</p>
            ) : (
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={foodData}>
                  <Area
                    type="monotone"
                    dataKey="grams"
                    stroke="var(--color-sage)"
                    fill="var(--color-sage)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div>
            <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--color-apricot)' }}>
              Spielen
            </p>
            {playTotal === 0 ? (
              <p className="text-[13px] text-text-secondary py-2">Noch keine Daten diese Woche.</p>
            ) : (
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={playData}>
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="var(--color-apricot)"
                    fill="var(--color-apricot)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  )
}
