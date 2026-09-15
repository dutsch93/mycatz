import { useAppData } from '../context/AppDataContext'
import { formatLongDate, todayIso } from '../lib/dates'
import DayStrip from '../components/calendar/DayStrip'
import FitnessRings from '../components/rings/FitnessRings'
import HabitList from '../components/habits/HabitList'

export default function Home() {
  const {
    authLoading,
    userId,
    loading,
    cats,
    groups,
    habits,
    target,
    catIdsForTarget,
    selectedDate,
    setSelectedDate,
    feedingLogs,
    playLogs,
    habitLogs,
    notes,
    logHabit,
    deleteFeedingLog,
    deletePlayLog,
    deleteNote,
  } = useAppData()

  if (authLoading || loading) {
    return <p className="py-6 text-text-secondary">Lädt…</p>
  }

  if (!userId) {
    return (
      <div className="py-6 text-center">
        <p className="text-text-secondary">Bitte meldet euch an, um MyCatz zu nutzen.</p>
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

  return (
    <div className="pb-6">
      <DayStrip selectedDate={selectedDate} onSelect={setSelectedDate} />

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

      <FitnessRings
        foodCurrentG={foodCurrentG}
        foodTargetG={foodTargetG || 1}
        playCurrentMin={playCurrentMin}
        playTargetMin={playTargetMin || 1}
      />

      {(feedingLogs.length > 0 || playLogs.length > 0 || notes.length > 0) && (
        <div className="flex flex-col gap-2 mt-4 mb-2">
          {feedingLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between bg-card border-[0.5px] border-border rounded-card px-3 py-2"
            >
              <span className="text-[13px] text-text-secondary">🍽️ {log.amount_g}g</span>
              <button
                type="button"
                onClick={() => deleteFeedingLog(log.id)}
                className="w-11 h-11 flex items-center justify-center text-muted-red"
                aria-label="Eintrag löschen"
              >
                ✕
              </button>
            </div>
          ))}
          {playLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between bg-card border-[0.5px] border-border rounded-card px-3 py-2"
            >
              <span className="text-[13px] text-text-secondary">🎾 {log.duration_min} min</span>
              <button
                type="button"
                onClick={() => deletePlayLog(log.id)}
                className="w-11 h-11 flex items-center justify-center text-muted-red"
                aria-label="Eintrag löschen"
              >
                ✕
              </button>
            </div>
          ))}
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-center justify-between bg-card border-[0.5px] border-border rounded-card px-3 py-2"
            >
              <span className="text-[13px] text-text-secondary">📝 {note.text}</span>
              <button
                type="button"
                onClick={() => deleteNote(note.id)}
                className="w-11 h-11 flex items-center justify-center text-muted-red"
                aria-label="Notiz löschen"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <HabitList
        habits={habits}
        logs={habitLogs}
        onLog={(habitId, value, extra) => logHabit(habitId, value, extra)}
      />

      {groups.length > 0 && (
        <p className="text-[13px] text-text-secondary mt-4">
          Tipp: Wechsle im Profil zwischen Katzen und Gruppen.
        </p>
      )}
    </div>
  )
}
