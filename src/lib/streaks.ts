import { addDays, todayIso } from './dates'
import type { HabitDefinition, HabitLog } from '../types'

// Zählt aufeinanderfolgende Tage (rückwärts ab `today`) mit value=true für einen Habit.
// Der heutige Tag bricht den Streak nicht ab, wenn er noch gar nicht geloggt wurde
// (kein Eintrag vorhanden) — erst ein expliziter 👎-Tag oder eine Lücke beendet ihn.
export function computeStreak(habitId: string, logs: HabitLog[], today: string = todayIso()): number {
  let streak = 0
  let cursor = today
  let first = true
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

// Beschriftung für einen Gesundheits-Event-Eintrag, abhängig vom Habit-Typ.
export function healthEventLabel(habit: HabitDefinition, log: HabitLog): string {
  if (habit.type === 'count' && log.count) return `${log.count}× ${habit.name}`
  if (habit.type === 'select' && log.selected_option) return `${habit.name}: ${log.selected_option}`
  return habit.name
}
