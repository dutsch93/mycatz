import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { addDays, todayIso } from '../lib/dates'
import type { FeedingLog, HabitLog, PlayLog, WeightLog } from '../types'

export type StatsRange = 'week' | 'month' | 'year'

export const RANGE_DAYS: Record<StatsRange, number> = { week: 7, month: 30, year: 365 }

// Lädt Rohdaten für den Statistik-Screen über einen Zeitraum (Woche/Monat/Jahr).
// Aggregation/Ableitung (Ø-Werte, Streaks, Events) passiert im Screen selbst.
export function useStats(catIds: string[], range: StatsRange) {
  const [feedingLogs, setFeedingLogs] = useState<FeedingLog[]>([])
  const [playLogs, setPlayLogs] = useState<PlayLog[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(false)

  const catKey = catIds.slice().sort().join(',')
  const days = RANGE_DAYS[range]
  const startDate = addDays(todayIso(), -(days - 1))

  useEffect(() => {
    if (catIds.length === 0) {
      setFeedingLogs([])
      setPlayLogs([])
      setHabitLogs([])
      setWeightLogs([])
      return
    }
    let cancelled = false

    async function load() {
      setLoading(true)
      const [feedRes, playRes, habitRes, weightRes] = await Promise.all([
        supabase.from('feeding_logs').select('*').in('cat_id', catIds).gte('date', startDate),
        supabase.from('play_logs').select('*').in('cat_id', catIds).gte('date', startDate),
        supabase.from('habit_logs').select('*').in('cat_id', catIds).gte('date', startDate),
        supabase
          .from('weight_logs')
          .select('*')
          .in('cat_id', catIds)
          .gte('date', startDate)
          .order('date'),
      ])
      if (cancelled) return
      setFeedingLogs((feedRes.data as FeedingLog[]) ?? [])
      setPlayLogs((playRes.data as PlayLog[]) ?? [])
      setHabitLogs((habitRes.data as HabitLog[]) ?? [])
      setWeightLogs((weightRes.data as WeightLog[]) ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
    // catKey statt catIds, damit sich der Effekt nicht bei jedem Render wiederholt
  }, [catKey, startDate]) // eslint-disable-line react-hooks/exhaustive-deps

  return { feedingLogs, playLogs, habitLogs, weightLogs, loading, days, startDate }
}
