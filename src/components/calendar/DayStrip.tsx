import { dayNumber, lastDays, todayIso, weekdayShort } from '../../lib/dates'

export default function DayStrip({
  selectedDate,
  onSelect,
}: {
  selectedDate: string
  onSelect: (date: string) => void
}) {
  const days = lastDays(selectedDate, 7)
  const today = todayIso()

  return (
    <div className="flex items-center justify-between gap-1 py-3">
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
    </div>
  )
}
