import { useState } from 'react'
import type { HabitDefinition, HabitLog } from '../../types'

interface Props {
  habit: HabitDefinition
  log: HabitLog | undefined
  // true, wenn dies eine Gruppe ist und die Katzen für diesen Habit unterschiedliche
  // Werte haben — dann zeigen wir keinen (willkürlichen) Einzelstatus an.
  mixed?: boolean
  onLog: (
    value: boolean,
    extra?: { count?: number | null; selectedOption?: string | null; note?: string | null },
  ) => void
}

export default function HabitItem({ habit, log, mixed, onLog }: Props) {
  const [countInputOpen, setCountInputOpen] = useState(false)
  const [countValue, setCountValue] = useState('1')
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteValue, setNoteValue] = useState(log?.note ?? '')

  function saveNote() {
    onLog(log?.value ?? true, {
      count: log?.count,
      selectedOption: log?.selected_option,
      note: noteValue || null,
    })
    setNoteOpen(false)
  }

  function confirmCount() {
    const n = Number(countValue)
    onLog(true, { count: Number.isFinite(n) ? n : 0, note: log?.note })
    setCountInputOpen(false)
  }

  return (
    <div className="border-b-[0.5px] border-border py-3 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-xl">{habit.emoji}</span>
        <span className="flex-1 text-text-primary">
          {habit.name}
          {mixed && <span className="ml-2 text-[13px] text-text-secondary">(gemischt)</span>}
        </span>

        {habit.type === 'count' && log?.value && (
          <span className="text-[13px] text-text-secondary">{log.count ?? 0}×</span>
        )}

        <button
          type="button"
          aria-label="Notiz"
          onClick={() => setNoteOpen((v) => !v)}
          className={`w-11 h-11 flex items-center justify-center ${
            log?.note ? 'text-apricot' : 'text-text-secondary'
          }`}
        >
          📝
        </button>

        {habit.type === 'select' ? (
          <select
            value={log?.selected_option ?? ''}
            onChange={(e) => onLog(true, { selectedOption: e.target.value, note: log?.note })}
            className="min-h-[44px] px-2 rounded-control bg-input border-[0.5px] border-border text-text-primary"
          >
            <option value="" disabled>
              wählen…
            </option>
            {(habit.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <>
            <button
              type="button"
              aria-label={`${habit.name} ja`}
              onClick={() =>
                habit.type === 'count' ? setCountInputOpen(true) : onLog(true, { note: log?.note })
              }
              className={`w-11 h-11 flex items-center justify-center rounded-control ${
                log?.value === true ? 'bg-sage/20' : ''
              }`}
            >
              👍
            </button>
            <button
              type="button"
              aria-label={`${habit.name} nein`}
              onClick={() => onLog(false, { count: 0, note: log?.note })}
              className={`w-11 h-11 flex items-center justify-center rounded-control ${
                log?.value === false ? 'bg-muted-red/20' : ''
              }`}
            >
              👎
            </button>
          </>
        )}
      </div>

      {countInputOpen && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="number"
            value={countValue}
            onChange={(e) => setCountValue(e.target.value)}
            className="w-20 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            autoFocus
          />
          <button
            type="button"
            onClick={confirmCount}
            className="min-h-[44px] px-4 rounded-control bg-apricot text-text-on-color"
          >
            Speichern
          </button>
        </div>
      )}

      {noteOpen && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder="Notiz"
            className="flex-1 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            autoFocus
          />
          <button
            type="button"
            onClick={saveNote}
            className="min-h-[44px] px-4 rounded-control bg-apricot text-text-on-color"
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}
