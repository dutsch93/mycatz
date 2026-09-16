import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ampelColor } from '../shared/AmpelDot'
import { toIsoDate, todayIso } from '../../lib/dates'

interface Props {
  initialDate: string
  catIds: string[]
  foodTargetG: number
  onSelect: (date: string) => void
  onClose: () => void
}

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// Vollbild-Monatskalender: Ampel-Punkt pro Tag zeigt den Fütterungs-Status
// (analog zum Ampelsystem aus CLAUDE.md). Tap auf einen Tag springt im
// Home-Screen zu diesem Tag.
export default function MonthOverlay({ initialDate, catIds, foodTargetG, onSelect, onClose }: Props) {
  const [y0, m0] = initialDate.split('-').map(Number)
  const [year, setYear] = useState(y0)
  const [month, setMonth] = useState(m0 - 1)
  const [amountsByDate, setAmountsByDate] = useState<Record<string, number>>({})

  const catKey = catIds.slice().sort().join(',')

  useEffect(() => {
    if (catIds.length === 0) {
      setAmountsByDate({})
      return
    }
    let cancelled = false

    async function load() {
      const start = toIsoDate(new Date(year, month, 1))
      const end = toIsoDate(new Date(year, month + 1, 0))
      const { data } = await supabase
        .from('feeding_logs')
        .select('date, amount_g')
        .in('cat_id', catIds)
        .gte('date', start)
        .lte('date', end)
      if (cancelled) return
      const sums: Record<string, number> = {}
      for (const row of (data as { date: string; amount_g: number }[]) ?? []) {
        sums[row.date] = (sums[row.date] ?? 0) + row.amount_g
      }
      setAmountsByDate(sums)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [year, month, catKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1)
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // Montag = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const list: (string | null)[] = Array.from({ length: firstWeekday }, () => null)
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(toIsoDate(new Date(year, month, d)))
    }
    return list
  }, [year, month])

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  })
  const today = todayIso()

  return (
    <div className="fixed inset-0 bg-page z-50 flex flex-col px-4 py-4 overflow-y-auto">
      <div className="relative flex items-center justify-center mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={prevMonth}
            className="w-11 h-11 flex items-center justify-center text-text-secondary"
            aria-label="Vorheriger Monat"
          >
            ‹
          </button>
          <h3 className="text-text-primary">{monthLabel}</h3>
          <button
            type="button"
            onClick={nextMonth}
            className="w-11 h-11 flex items-center justify-center text-text-secondary"
            aria-label="Nächster Monat"
          >
            ›
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 w-11 h-11 flex items-center justify-center text-text-secondary"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[13px] text-text-secondary mb-1">
        {WEEKDAY_HEADERS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />
          const amount = amountsByDate[date] ?? 0
          const percent = foodTargetG > 0 ? Math.round((amount / foodTargetG) * 100) : 0
          const hasData = amount > 0
          const isToday = date === today
          return (
            <button
              key={date}
              type="button"
              onClick={() => {
                onSelect(date)
                onClose()
              }}
              className={`flex flex-col items-center justify-center gap-1 h-12 rounded-control ${
                isToday ? 'bg-input' : ''
              }`}
            >
              <span className="text-[13px] text-text-primary">{Number(date.split('-')[2])}</span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: hasData ? ampelColor(percent) : 'transparent' }}
              />
            </button>
          )
        })}
      </div>

      <p className="text-[13px] text-text-secondary text-center mt-4">
        Tippe auf einen Tag, um ihn auf dem Home-Screen zu öffnen.
      </p>
    </div>
  )
}
