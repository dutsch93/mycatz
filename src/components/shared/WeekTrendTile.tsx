import { useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useStats } from '../../hooks/useStats'
import { lastDays, todayIso } from '../../lib/dates'
import GlassCard from './GlassCard'

// Sparkline der letzten 7 Tage Futter-Logs der aktuell ausgewählten Katze/Gruppe.
// Nutzt useStats (bereits vorhanden, gleiches Muster wie Stats.tsx) statt eines
// neuen Endpoints — reine Client-seitige Aggregation.
export default function WeekTrendTile({ catIds }: { catIds: string[] }) {
  const { feedingLogs, loading } = useStats(catIds, 'week')

  const data = useMemo(() => {
    const days = lastDays(todayIso(), 7)
    return days.map((day) => ({
      day,
      grams: feedingLogs.filter((l) => l.date === day).reduce((sum, l) => sum + l.amount_g, 0),
    }))
  }, [feedingLogs])

  if (catIds.length === 0) return null

  const total = data.reduce((sum, d) => sum + d.grams, 0)

  return (
    <GlassCard className="p-3 mt-3">
      <p className="text-[13px] text-text-secondary mb-1">Futter-Trend (7 Tage)</p>
      {loading ? (
        <p className="text-[13px] text-text-secondary py-4">Lädt…</p>
      ) : total === 0 ? (
        <p className="text-[13px] text-text-secondary py-4">Noch keine Daten diese Woche.</p>
      ) : (
        <ResponsiveContainer width="100%" height={60}>
          <AreaChart data={data}>
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
    </GlassCard>
  )
}
