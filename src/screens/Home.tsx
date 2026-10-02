import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { formatLongDate, todayIso } from '../lib/dates'
import { isWebNfcSupported, scanNfcTag } from '../lib/nfc'
import { Utensils, Volleyball, NotebookPen, X, Nfc, ChevronDown, ChevronUp } from 'lucide-react'
import DayStrip from '../components/calendar/DayStrip'
import MonthOverlay from '../components/calendar/MonthOverlay'
import FitnessRings from '../components/rings/FitnessRings'
import HabitList from '../components/habits/HabitList'
import GlassCard from '../components/shared/GlassCard'
import WeekTrendTile from '../components/shared/WeekTrendTile'
import type { FeedingLog, PlayLog } from '../types'

type ActivityEntry = { kind: 'feeding'; log: FeedingLog } | { kind: 'play'; log: PlayLog }

// Eine Zeile der Aktivitäts-Karte: zeigt Katze, Icon und (sofern erlaubt) editierbaren Wert.
function ActivityRow({
  entry,
  catName,
  canEdit,
  onUpdateFeeding,
  onUpdatePlay,
  onDeleteFeeding,
  onDeletePlay,
}: {
  entry: ActivityEntry
  catName: (catId: string) => string
  canEdit: boolean
  onUpdateFeeding: (id: string, amountG: number) => void
  onUpdatePlay: (id: string, durationMin: number) => void
  onDeleteFeeding: (id: string) => void
  onDeletePlay: (id: string) => void
}) {
  const { kind, log } = entry
  const Icon = kind === 'feeding' ? Utensils : Volleyball
  const value = kind === 'feeding' ? log.amount_g : log.duration_min
  const unit = kind === 'feeding' ? 'g' : 'min'

  return (
    <div className="flex items-center gap-2 bg-input rounded-control px-3 py-2">
      <Icon size={16} strokeWidth={1.75} className="text-text-secondary shrink-0" />
      <span className="flex-1 min-w-0 truncate text-[13px] text-text-primary">
        {catName(log.cat_id)}
      </span>
      {canEdit ? (
        <span className="flex items-center gap-1 w-20 shrink-0 text-[13px] text-text-secondary">
          <input
            type="number"
            defaultValue={value}
            onBlur={(e) => {
              const next = Number(e.target.value)
              if (next <= 0 || next === value) return
              if (kind === 'feeding') onUpdateFeeding(log.id, next)
              else onUpdatePlay(log.id, next)
            }}
            className="w-12 min-h-[32px] px-1 rounded bg-card text-right"
          />
          <span className="w-7 text-left">{unit}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 w-20 shrink-0 text-[13px] text-text-secondary">
          <span className="flex-1 text-right">{value}</span>
          <span className="w-7 text-left">{unit}</span>
        </span>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => (kind === 'feeding' ? onDeleteFeeding(log.id) : onDeletePlay(log.id))}
          className="w-8 h-8 shrink-0 flex items-center justify-center text-muted-red"
          aria-label="Eintrag löschen"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export default function Home() {
  const {
    authLoading,
    userId,
    loading,
    profile,
    cats,
    habits,
    catHabitExclusions,
    target,
    catIdsForTarget,
    selectedDate,
    setSelectedDate,
    feedingLogs,
    playLogs,
    habitLogs,
    notes,
    logHabit,
    logNfcTag,
    deleteFeedingLog,
    deletePlayLog,
    updateFeedingLog,
    updatePlayLog,
    deleteNote,
  } = useAppData()

  const [scanning, setScanning] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)

  function handleNfcScan() {
    setScanning(true)
    scanNfcTag(
      (tagId) => {
        setScanning(false)
        logNfcTag(tagId)
      },
      () => setScanning(false),
    )
  }

  if (authLoading || loading) {
    return <p className="py-6 text-text-secondary">Lädt…</p>
  }

  if (!userId) {
    return (
      <div className="py-6 text-center flex flex-col gap-3">
        <p className="text-text-secondary">Bitte meldet euch an, um MyCatz zu nutzen.</p>
        <Link to="/login" className="text-apricot underline">
          Zum Login
        </Link>
      </div>
    )
  }

  if (cats.length === 0) {
    return (
      <div className="py-6 text-center flex flex-col gap-3">
        <p className="text-text-secondary">Noch keine Katzen eingerichtet.</p>
      </div>
    )
  }

  const targetCats =
    target?.type === 'cat'
      ? cats.filter((c) => c.id === target.id)
      : cats.filter((c) => catIdsForTarget.includes(c.id))

  const foodTargetG = targetCats.reduce((sum, c) => sum + c.daily_food_target_g, 0)
  const playTargetMin = targetCats.reduce((sum, c) => sum + c.daily_play_target_min, 0)
  const foodCurrentG = feedingLogs.reduce((sum, l) => sum + l.amount_g, 0)
  const playCurrentMin = playLogs.reduce((sum, l) => sum + l.duration_min, 0)

  const isToday = selectedDate === todayIso()
  const canEdit = profile?.role !== 'guest'

  function catName(catId: string) {
    return cats.find((c) => c.id === catId)?.name ?? '—'
  }

  // Ein Habit ist sichtbar, wenn er für mindestens eine der Zielkatzen aktiv ist
  // (nicht in cat_habit_exclusions eingetragen).
  const visibleHabits = habits.filter((habit) =>
    catIdsForTarget.some(
      (catId) =>
        !catHabitExclusions.some((ex) => ex.cat_id === catId && ex.habit_id === habit.id),
    ),
  )

  return (
    <div className="pb-6">
      <DayStrip
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        onOpenMonth={() => setMonthOpen(true)}
      />

      {monthOpen && (
        <MonthOverlay
          initialDate={selectedDate}
          catIds={catIdsForTarget}
          foodTargetG={foodTargetG}
          onSelect={setSelectedDate}
          onClose={() => setMonthOpen(false)}
        />
      )}

      {!isToday && (
        <div className="flex items-center justify-between bg-input rounded-control px-3 py-2 mb-3">
          <span className="text-[13px] text-text-secondary">{formatLongDate(selectedDate)}</span>
          <button
            type="button"
            onClick={() => setSelectedDate(todayIso())}
            className="text-[13px] text-apricot"
          >
            Zurück zu Heute
          </button>
        </div>
      )}

      <GlassCard className="p-3">
        <FitnessRings
          foodCurrentG={foodCurrentG}
          foodTargetG={foodTargetG || 1}
          playCurrentMin={playCurrentMin}
          playTargetMin={playTargetMin || 1}
        />
      </GlassCard>

      <WeekTrendTile catIds={catIdsForTarget} />

      {isWebNfcSupported() && (
        <button
          type="button"
          onClick={handleNfcScan}
          disabled={scanning}
          className="w-full min-h-[44px] mt-2 rounded-control border-[0.5px] border-border bg-input text-text-primary disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Nfc size={18} strokeWidth={1.75} />
          {scanning ? 'Halte dein Handy an den Tag…' : 'NFC-Tag scannen'}
        </button>
      )}

      {(feedingLogs.length > 0 || playLogs.length > 0) &&
        (() => {
          const entries: ActivityEntry[] = [
            ...feedingLogs.map((log) => ({ kind: 'feeding' as const, log })),
            ...playLogs.map((log) => ({ kind: 'play' as const, log })),
          ].sort((a, b) => b.log.logged_at.localeCompare(a.log.logged_at))
          const visible = entries.slice(0, 2)
          const rest = entries.slice(2)

          return (
            <GlassCard className="p-3 mt-3">
              <p className="text-[13px] text-text-secondary mb-1">Aktivität</p>
              <div className="flex flex-col gap-2">
                {visible.map((entry) => (
                  <ActivityRow
                    key={`${entry.kind}-${entry.log.id}`}
                    entry={entry}
                    catName={catName}
                    canEdit={canEdit}
                    onUpdateFeeding={updateFeedingLog}
                    onUpdatePlay={updatePlayLog}
                    onDeleteFeeding={deleteFeedingLog}
                    onDeletePlay={deletePlayLog}
                  />
                ))}
              </div>
              {rest.length > 0 && (
                <>
                  {activityOpen && (
                    <div className="flex flex-col gap-2 pt-2">
                      {rest.map((entry) => (
                        <ActivityRow
                          key={`${entry.kind}-${entry.log.id}`}
                          entry={entry}
                          catName={catName}
                          canEdit={canEdit}
                          onUpdateFeeding={updateFeedingLog}
                          onUpdatePlay={updatePlayLog}
                          onDeleteFeeding={deleteFeedingLog}
                          onDeletePlay={deletePlayLog}
                        />
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setActivityOpen((o) => !o)}
                    className="w-full flex items-center justify-center gap-1 min-h-[32px] mt-1 text-[13px] text-text-secondary"
                  >
                    {activityOpen ? 'Weniger anzeigen' : `${rest.length} weitere anzeigen`}
                    {activityOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </>
              )}
            </GlassCard>
          )
        })()}

      {notes.length > 0 && (
        <div className="flex flex-col gap-2 mt-3">
          {notes.map((note) => (
            <div key={note.id} className="glass flex items-center justify-between px-3 py-2">
              <span className="flex items-center gap-2 text-[13px] text-text-secondary">
                <NotebookPen size={16} strokeWidth={1.75} /> {note.text}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => deleteNote(note.id)}
                  className="w-11 h-11 flex items-center justify-center text-muted-red"
                  aria-label="Notiz löschen"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <HabitList
        habits={visibleHabits}
        logs={habitLogs}
        onLog={(habitId, value, extra) => logHabit(habitId, value, extra)}
      />
    </div>
  )
}
