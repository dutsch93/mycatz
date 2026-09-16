import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAppData } from '../context/AppDataContext'
import { useStats, type StatsRange } from '../hooks/useStats'
import { addDays, dayNumber, lastDays, lastMonths, monthShortLabel, todayIso, weekdayShort } from '../lib/dates'
import type { HabitDefinition, HabitLog } from '../types'

const RANGE_LABELS: Record<StatsRange, string> = { week: 'Woche', month: 'Monat', year: 'Jahr' }

function buildDailyChartData(
  range: StatsRange,
  days: number,
  sumFor: (date: string) => number,
) {
  const dates = lastDays(todayIso(), days)
  return dates.map((date) => ({
    label: range === 'week' ? weekdayShort(date) : String(dayNumber(date)),
    value: sumFor(date),
  }))
}

function buildMonthlyChartData(sumForMonth: (monthKey: string) => number) {
  const months = lastMonths(12)
  return months.map((key) => ({ label: monthShortLabel(key), value: sumForMonth(key) }))
}

function computeStreak(habitId: string, logs: HabitLog[]): number {
  let streak = 0
  let cursor = todayIso()
  let first = true
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const dayLogs = logs.filter((l) => l.habit_id === habitId && l.date === cursor)
    const hit = dayLogs.some((l) => l.value === true)
    if (hit) {
      streak++
    } else if (first && dayLogs.length === 0) {
      // heute evtl. noch nicht geloggt — Streak deswegen nicht abbrechen
    } else {
      break
    }
    first = false
    cursor = addDays(cursor, -1)
  }
  return streak
}

function healthEventLabel(habit: HabitDefinition, log: HabitLog): string {
  if (habit.type === 'count' && log.count) return `${log.count}× ${habit.name}`
  if (habit.type === 'select' && log.selected_option) return `${habit.name}: ${log.selected_option}`
  return habit.name
}

export default function Stats() {
  const { cats, habits, catIdsForTarget, target } = useAppData()
  const [range, setRange] = useState<StatsRange>('week')
  const { feedingLogs, playLogs, habitLogs, weightLogs, loading, days } = useStats(
    catIdsForTarget,
    range,
  )

  const targetCats = useMemo(
    () =>
      target?.type === 'cat'
        ? cats.filter((c) => c.id === target.id)
        : cats.filter((c) => catIdsForTarget.includes(c.id)),
    [cats, catIdsForTarget, target],
  )

  const foodTargetG = targetCats.reduce((sum, c) => sum + c.daily_food_target_g, 0)
  const playTargetMin = targetCats.reduce((sum, c) => sum + c.daily_play_target_min, 0)

  const foodChartData = useMemo(() => {
    if (range === 'year') {
      return buildMonthlyChartData((monthKey) =>
        feedingLogs
          .filter((l) => l.date.startsWith(monthKey))
          .reduce((sum, l) => sum + l.amount_g, 0),
      )
    }
    return buildDailyChartData(range, days, (date) =>
      feedingLogs.filter((l) => l.date === date).reduce((sum, l) => sum + l.amount_g, 0),
    )
  }, [range, days, feedingLogs])

  const playChartData = useMemo(() => {
    if (range === 'year') {
      return buildMonthlyChartData((monthKey) =>
        playLogs
          .filter((l) => l.date.startsWith(monthKey))
          .reduce((sum, l) => sum + l.duration_min, 0),
      )
    }
    return buildDailyChartData(range, days, (date) =>
      playLogs.filter((l) => l.date === date).reduce((sum, l) => sum + l.duration_min, 0),
    )
  }, [range, days, playLogs])

  const avgFoodG = feedingLogs.reduce((sum, l) => sum + l.amount_g, 0) / days
  const avgPlayMin = playLogs.reduce((sum, l) => sum + l.duration_min, 0) / days

  const streaks = useMemo(
    () =>
      habits
        .map((habit) => ({ habit, streak: computeStreak(habit.id, habitLogs) }))
        .filter((s) => s.streak > 0)
        .sort((a, b) => b.streak - a.streak),
    [habits, habitLogs],
  )

  const weightChartData = useMemo(() => {
    const byDate = new Map<string, number[]>()
    for (const log of weightLogs) {
      const list = byDate.get(log.date) ?? []
      list.push(log.weight_kg)
      byDate.set(log.date, list)
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        label: `${dayNumber(date)}.`,
        value: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100,
      }))
  }, [weightLogs])

  const healthEvents = useMemo(
    () =>
      habitLogs
        .filter((l) => {
          const habit = habits.find((h) => h.id === l.habit_id)
          return habit?.category === 'health' && l.value === true
        })
        .map((l) => ({ log: l, habit: habits.find((h) => h.id === l.habit_id)! }))
        .sort((a, b) => b.log.date.localeCompare(a.log.date))
        .slice(0, 15),
    [habitLogs, habits],
  )

  if (catIdsForTarget.length === 0) {
    return (
      <div className="py-6">
        <h2>Statistik</h2>
        <p className="text-text-secondary mt-2">Wähle im Profil eine Katze oder Gruppe aus.</p>
      </div>
    )
  }

  return (
    <div className="py-6 flex flex-col gap-6 pb-10">
      <h2>Statistik</h2>

      <div className="flex gap-2">
        {(Object.keys(RANGE_LABELS) as StatsRange[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`min-h-[36px] px-4 rounded-control text-[13px] ${
              range === r ? 'bg-apricot text-text-on-color' : 'bg-input text-text-secondary'
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {loading && <p className="text-[13px] text-text-secondary">Lädt…</p>}

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">Futter</h3>
        <div className="bg-card border-[0.5px] border-border rounded-card p-3" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={foodChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-sage)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[13px] text-text-secondary">
          Ø {Math.round(avgFoodG)}g / Tag {foodTargetG > 0 && <>· Ziel: {foodTargetG}g</>}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">Spielzeit</h3>
        <div className="bg-card border-[0.5px] border-border rounded-card p-3" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={playChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-apricot)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[13px] text-text-secondary">
          Ø {Math.round(avgPlayMin)} min / Tag {playTargetMin > 0 && <>· Ziel: {playTargetMin} min</>}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">Habit-Streaks</h3>
        {streaks.length === 0 ? (
          <p className="text-[13px] text-text-secondary">Noch keine Streaks in diesem Zeitraum.</p>
        ) : (
          <div className="flex flex-col">
            {streaks.map(({ habit, streak }) => (
              <div
                key={habit.id}
                className="flex items-center justify-between border-b-[0.5px] border-border py-2 last:border-b-0"
              >
                <span className="text-text-primary">
                  {habit.emoji} {habit.name}
                </span>
                <span className="text-[13px] text-text-secondary">
                  {streak} {streak === 1 ? 'Tag' : 'Tage'} {streak >= 3 && '🔥'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {weightChartData.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
            Gewichtsverlauf
          </h3>
          <div
            className="bg-card border-[0.5px] border-border rounded-card p-3"
            style={{ height: 160 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-apricot)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] text-text-secondary uppercase tracking-wide">
          Gesundheits-Events
        </h3>
        {healthEvents.length === 0 ? (
          <p className="text-[13px] text-text-secondary">Keine Gesundheits-Events im Zeitraum.</p>
        ) : (
          <div className="flex flex-col">
            {healthEvents.map(({ log, habit }) => (
              <div
                key={log.id}
                className="flex items-center gap-2 border-b-[0.5px] border-border py-2 last:border-b-0"
              >
                <span className="text-[13px] text-text-secondary">
                  {log.date.split('-').reverse().slice(0, 2).join('.')}.
                </span>
                <span className="text-text-primary">
                  {habit.emoji} {healthEventLabel(habit, log)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
