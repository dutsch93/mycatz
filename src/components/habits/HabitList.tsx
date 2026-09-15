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

export default function HabitList({ habits, logs, onLog }: Props) {
  if (habits.length === 0) {
    return <p className="text-[13px] text-text-secondary py-4">Noch keine Habits eingerichtet.</p>
  }

  return (
    <div>
      <h3 className="text-[13px] text-text-secondary uppercase tracking-wide mb-1">
        Daily Habits
      </h3>
      {habits.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          log={logs.find((l) => l.habit_id === habit.id)}
          onLog={(value, extra) => onLog(habit.id, value, extra)}
        />
      ))}
    </div>
  )
}
