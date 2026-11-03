import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../context/AppDataContext'
import { combineDateAndTime, formatLongDate, timeOfDay, todayIso } from '../lib/dates'
import { isWebNfcSupported, scanNfcTag } from '../lib/nfc'
import { Utensils, Volleyball, NotebookPen, X, Nfc, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import DayStrip from '../components/calendar/DayStrip'
import MonthOverlay from '../components/calendar/MonthOverlay'
import FitnessRings from '../components/rings/FitnessRings'
import HabitList from '../components/habits/HabitList'
import GlassCard from '../components/shared/GlassCard'
import WeekTrendTile from '../components/shared/WeekTrendTile'
import type { FeedingLog, PlayLog } from '../types'

type ActivityEntry = { kind: 'feeding'; log: FeedingLog } | { kind: 'play'; log: PlayLog }

// Eine Zeile der Aktivitäts-Karte. Zugeklappt: Katze, Icon und Menge. Aufgeklappt: Uhrzeit
// des Eintrags und (sofern erlaubt) Felder zum Bearbeiten von Menge und Uhrzeit.
function ActivityRow({
  entry,
  catName,
  foodTypeName,
  canEdit,
  onUpdateFeeding,
  onUpdatePlay,
  onDeleteFeeding,
  onDeletePlay,
}: {
  entry: ActivityEntry
  catName: (catId: string) => string
  foodTypeName: (foodTypeId: string) => string | undefined
  canEdit: boolean
  onUpdateFeeding: (id: string, amountG: number, loggedAt?: string) => Promise<void>
  onUpdatePlay: (id: string, durationMin: number, loggedAt?: string) => Promise<void>
  onDeleteFeeding: (id: string) => void
  onDeletePlay: (id: string) => void
}) {
  const { kind, log } = entry
  const Icon = kind === 'feeding' ? Utensils : Volleyball
  const value = kind === 'feeding' ? log.amount_g : log.duration_min
  const unit = kind === 'feeding' ? 'g' : 'min'
  const time = timeOfDay(log.logged_at)
  const subtitle = kind === 'feeding' ? foodTypeName(log.food_type_id) : 'Spielzeit'

  const [open, setOpen] = useState(false)
  const [valueInput, setValueInput] = useState(String(value))
  const [timeInput, setTimeInput] = useState(time)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Beim Aufklappen die Felder mit den aktuellen Werten füllen (falls sich der
  // Eintrag inzwischen geändert hat, z. B. per Realtime von einem anderen Gerät).
  function toggle() {
    if (!open) {
      setValueInput(String(value))
      setTimeInput(time)
      setError(null)
    }
    setOpen((o) => !o)
  }

  const nextValue = Number(valueInput)
  const valid = Number.isFinite(nextValue) && nextValue > 0 && /^\d{2}:\d{2}$/.test(timeInput)
  const changed = nextValue !== value || timeInput !== time

  async function save() {
    if (!valid || !changed) return
    setSaving(true)
    setError(null)
    // Uhrzeit nur mitschicken, wenn sie geändert wurde — sonst bleiben die Sekunden erhalten.
    const loggedAt = timeInput !== time ? combineDateAndTime(log.date, timeInput) : undefined
    try {
      if (kind === 'feeding') await onUpdateFeeding(log.id, nextValue, loggedAt)
      else await onUpdatePlay(log.id, nextValue, loggedAt)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-input rounded-control">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2 text-left"
      >
        <Icon size={16} strokeWidth={1.75} className="text-text-secondary shrink-0" />
        <span className="flex-1 min-w-0 truncate text-[13px] text-text-primary">
          {catName(log.cat_id)}
          {subtitle && <span className="text-text-secondary"> · {subtitle}</span>}
        </span>
        <span className="shrink-0 text-[13px] text-text-secondary tabular-nums">
          {value} {unit}
        </span>
        <ChevronDown
          size={16}
          className={`text-text-secondary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          <p className="flex items-center gap-1 text-[13px] text-text-secondary">
            <Clock size={14} strokeWidth={1.75} /> Eingetragen um {time} Uhr
            {log.note && <span className="truncate"> · {log.note}</span>}
          </p>

          {canEdit && (
            <>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[13px] text-text-secondary">
                  <span className="sr-only">{kind === 'feeding' ? 'Menge' : 'Dauer'}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    className="w-20 min-h-[44px] px-2 rounded-control bg-card border-[0.5px] border-border text-right text-text-primary"
                  />
                  {unit}
                </label>
                <label className="flex items-center gap-1 text-[13px] text-text-secondary">
                  <span className="sr-only">Uhrzeit</span>
                  <input
                    type="time"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    className="min-h-[44px] px-2 rounded-control bg-card border-[0.5px] border-border text-text-primary"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={!valid || !changed || saving}
                  className="min-h-[44px] px-4 rounded-control bg-apricot text-text-on-color disabled:opacity-50"
                >
                  {saving ? 'Speichert…' : 'Speichern'}
                </button>
                <button
                  type="button"
                  onClick={() => (kind === 'feeding' ? onDeleteFeeding(log.id) : onDeletePlay(log.id))}
                  className="min-h-[44px] px-4 rounded-control text-muted-red flex items-center gap-1"
                >
                  <X size={16} /> Löschen
                </button>
              </div>
              {error && <p className="text-[13px] text-muted-red">{error}</p>}
            </>
          )}
        </div>
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
    foodTypes,
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

  function foodTypeName(foodTypeId: string) {
    return foodTypes.find((f) => f.id === foodTypeId)?.name
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
                    foodTypeName={foodTypeName}
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
                          foodTypeName={foodTypeName}
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
