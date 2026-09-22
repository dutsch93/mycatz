import { CalendarDays } from 'lucide-react'
import { dayNumber, lastDays, todayIso, weekdayShort } from '../../lib/dates'

export default function DayStrip({
  selectedDate,
  onSelect,
  onOpenMonth,
}: {
  selectedDate: string
  onSelect: (date: string) => void
  onOpenMonth: () => void
}) {
  const days = lastDays(selectedDate, 7)
  const today = todayIso()

  return (
    <div className="glass flex items-center justify-between gap-1 px-2 py-3 mb-3">
      {days.map((day) => {
        const isSelected = day === selectedDate
        const isToday = day === today
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(day)}
            className={`flex flex-col items-center justify-center gap-0.5 w-10 h-14 rounded-control ${
              isSelected ? 'bg-apricot text-text-on-color' : 'text-text-primary'
            }`}
          >
            <span className="text-[13px]">{weekdayShort(day)}</span>
            <span className="text-[16px]">{dayNumber(day)}</span>
            {isToday && !isSelected && <span className="w-1 h-1 rounded-full bg-apricot" />}
          </button>
        )
      })}
      <button
        type="button"
        onClick={onOpenMonth}
        aria-label="Monatskalender öffnen"
        className="flex items-center justify-center w-10 h-14 rounded-control text-text-secondary"
      >
        <CalendarDays size={20} strokeWidth={1.75} />
      </button>
    </div>
  )
}
