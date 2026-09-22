import { useState } from 'react'
import { ChevronDown, Pencil } from 'lucide-react'
import type { HabitDefinition, HabitLog } from '../../types'
import { resolveHabitIcon } from '../../lib/habitIcons'

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
  const [open, setOpen] = useState(false)
  const [countValue, setCountValue] = useState(String(log?.count ?? 1))
  const [noteValue, setNoteValue] = useState(log?.note ?? '')

  const Icon = resolveHabitIcon(habit.name)

  function confirmCount() {
    const n = Number(countValue)
    onLog(true, { count: Number.isFinite(n) ? n : 0, note: log?.note })
  }

  function saveNote() {
    onLog(log?.value ?? true, {
      count: log?.count,
      selectedOption: log?.selected_option,
      note: noteValue || null,
    })
  }

  const statusText =
    habit.type === 'count'
      ? log?.value
        ? `${log.count ?? 0}×`
        : undefined
      : habit.type === 'select'
        ? (log?.selected_option ?? undefined)
        : log?.value === true
          ? 'Ja'
          : log?.value === false
            ? 'Nein'
            : undefined

  return (
    <div className="border-b-[0.5px] border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full min-h-[44px] flex items-center gap-3 py-3"
      >
        <Icon size={20} strokeWidth={1.75} className="text-text-primary shrink-0" />
        <span className="flex-1 text-left text-text-primary">
          {habit.name}
          {mixed && <span className="ml-2 text-[13px] text-text-secondary">(gemischt)</span>}
        </span>
        {statusText && <span className="text-[13px] text-text-secondary">{statusText}</span>}
        {log?.note && <Pencil size={12} className="text-apricot shrink-0" />}
        <ChevronDown
          size={18}
          className={`text-text-secondary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="pb-3 pl-8 flex flex-col gap-2">
          {habit.type === 'boolean' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLog(true, { note: log?.note })}
                className={`min-h-[44px] px-4 rounded-control ${log?.value === true ? 'bg-sage/20' : 'bg-input'}`}
              >
                Ja
              </button>
              <button
                type="button"
                onClick={() => onLog(false, { note: log?.note })}
                className={`min-h-[44px] px-4 rounded-control ${log?.value === false ? 'bg-muted-red/20' : 'bg-input'}`}
              >
                Nein
              </button>
            </div>
          )}

          {habit.type === 'count' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={countValue}
                onChange={(e) => setCountValue(e.target.value)}
                className="w-20 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
              />
              <button
                type="button"
                onClick={confirmCount}
                className="min-h-[44px] px-4 rounded-control bg-apricot text-text-on-color"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => onLog(false, { count: 0, note: log?.note })}
                className="min-h-[44px] px-4 rounded-control text-text-secondary"
              >
                Keine
              </button>
            </div>
          )}

          {habit.type === 'select' && (
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
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Notiz"
              className="flex-1 min-h-[44px] px-3 rounded-control bg-input border-[0.5px] border-border"
            />
            <button
              type="button"
              onClick={saveNote}
              className="min-h-[44px] px-4 rounded-control bg-apricot text-text-on-color"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
