import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ampelColor } from './AmpelDot'
import GlassCard from './GlassCard'
import type { Cat } from '../../types'
import type { Target } from '../../context/AppDataContext'

// Zeigt pro Katze im Haushalt einen Mini-Ring (Futter-Fortschritt des Tages).
// Tap wechselt die aktive Auswahl über denselben Mechanismus wie Profile.tsx.
// Nur sichtbar, wenn mehr als eine Katze im Haushalt ist.
export default function MultiCatTile({
  cats,
  date,
  target,
  onSelect,
}: {
  cats: Cat[]
  date: string
  target: Target | null
  onSelect: (t: Target) => void
}) {
  const [totals, setTotals] = useState<Record<string, number>>({})
  const catKey = cats
    .map((c) => c.id)
    .slice()
    .sort()
    .join(',')

  useEffect(() => {
    if (cats.length === 0) return
    let cancelled = false
    supabase
      .from('feeding_logs')
      .select('cat_id, amount_g')
      .in(
        'cat_id',
        cats.map((c) => c.id),
      )
      .eq('date', date)
      .then(({ data }) => {
        if (cancelled || !data) return
        const sums: Record<string, number> = {}
        for (const row of data as { cat_id: string; amount_g: number }[]) {
          sums[row.cat_id] = (sums[row.cat_id] ?? 0) + row.amount_g
        }
        setTotals(sums)
      })
    return () => {
      cancelled = true
    }
    // catKey statt cats, damit sich der Effekt nicht bei jeder neuen Array-Referenz wiederholt
  }, [catKey, date]) // eslint-disable-line react-hooks/exhaustive-deps

  if (cats.length <= 1) return null

  return (
    <GlassCard className="p-3 mt-3 flex flex-col gap-1">
      <p className="text-[13px] text-text-secondary mb-1">Katzen</p>
      {cats.map((cat) => {
        const current = totals[cat.id] ?? 0
        const percent =
          cat.daily_food_target_g > 0
            ? Math.min(Math.round((current / cat.daily_food_target_g) * 100), 100)
            : 0
        const isSelected = target?.type === 'cat' && target.id === cat.id
        const color = ampelColor(percent)
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect({ type: 'cat', id: cat.id })}
            className={`flex items-center gap-3 min-h-[44px] px-2 rounded-control ${
              isSelected ? 'bg-input' : ''
            }`}
          >
            <span
              className="relative w-8 h-8 shrink-0 rounded-full"
              style={{ background: `conic-gradient(${color} ${percent}%, var(--bg-input) 0)` }}
            >
              <span className="absolute inset-[3px] rounded-full bg-card" />
            </span>
            <span className="flex-1 text-left text-text-primary">{cat.name}</span>
            <span className="text-[13px] text-text-secondary">{percent}%</span>
          </button>
        )
      })}
    </GlassCard>
  )
}
