import type { HabitDefinition, HabitLog } from '../../types'
import HabitItem from './HabitItem'

interface Props {
  habits: HabitDefinition[]
  logs: HabitLog[]
  onLog: (
    habitId: string,
    value: boolean,
    extra?: { count?: number | null; selectedOption?: string | null; note?: string | null },
  ) => void
}

// Bei einer Gruppe kann es pro Habit mehrere Log-Zeilen geben (eine je Katze).
// Stimmen sie nicht überein, zeigen wir keinen willkürlichen Einzelstatus an,
// sondern markieren den Habit als "gemischt".
function resolveHabitLog(logs: HabitLog[], habitId: string) {
  const matches = logs.filter((l) => l.habit_id === habitId)
  if (matches.length === 0) return { log: undefined, mixed: false }
  const first = matches[0]
  const allAgree = matches.every(
    (l) =>
      l.value === first.value &&
      l.count === first.count &&
      l.selected_option === first.selected_option,
  )
  return { log: allAgree ? first : undefined, mixed: !allAgree }
}

export default function HabitList({ habits, logs, onLog }: Props) {
  if (habits.length === 0) {
    return <p className="text-[13px] text-text-secondary py-4">Noch keine Habits eingerichtet.</p>
  }

  return (
    <div>
      <h3 className="text-[13px] text-text-secondary uppercase tracking-wide mb-1">
        Daily Habits
      </h3>
      {habits.map((habit) => {
        const { log, mixed } = resolveHabitLog(logs, habit.id)
        return (
          <HabitItem
            key={habit.id}
            habit={habit}
            log={log}
            mixed={mixed}
            onLog={(value, extra) => onLog(habit.id, value, extra)}
          />
        )
      })}
    </div>
  )
}
