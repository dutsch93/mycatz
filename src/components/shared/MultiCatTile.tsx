import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ampelColor } from './AmpelDot'
import GlassCard from './GlassCard'
import type { Cat } from '../../types'
import type { CatGroupWithMembers } from '../../hooks/useHouseholdData'
import type { Target } from '../../context/AppDataContext'

// Zeigt pro Katze und pro Gruppe im Haushalt einen Mini-Ring (Futter-Fortschritt des Tages).
// Tap wechselt die aktive Auswahl über denselben Mechanismus wie Profile.tsx — so kommt man
// von einer Einzelkatze auch ohne Umweg über Profile zurück zur Gruppe (und umgekehrt).
// Nur sichtbar, wenn es mehr als eine Katze ODER mindestens eine Gruppe gibt.
export default function MultiCatTile({
  cats,
  groups,
  date,
  target,
  onSelect,
}: {
  cats: Cat[]
  groups: CatGroupWithMembers[]
  date: string
  target: Target | null
  onSelect: (t: Target) => void
}) {
  const [foodTotals, setFoodTotals] = useState<Record<string, number>>({})
  const [playTotals, setPlayTotals] = useState<Record<string, number>>({})
  const catKey = cats
    .map((c) => c.id)
    .slice()
    .sort()
    .join(',')

  useEffect(() => {
    if (cats.length === 0) return
    let cancelled = false
    const catIds = cats.map((c) => c.id)
    Promise.all([
      supabase.from('feeding_logs').select('cat_id, amount_g').in('cat_id', catIds).eq('date', date),
      supabase.from('play_logs').select('cat_id, duration_min').in('cat_id', catIds).eq('date', date),
    ]).then(([feedRes, playRes]) => {
      if (cancelled) return
      const foodSums: Record<string, number> = {}
      for (const row of (feedRes.data ?? []) as { cat_id: string; amount_g: number }[]) {
        foodSums[row.cat_id] = (foodSums[row.cat_id] ?? 0) + row.amount_g
      }
      const playSums: Record<string, number> = {}
      for (const row of (playRes.data ?? []) as { cat_id: string; duration_min: number }[]) {
        playSums[row.cat_id] = (playSums[row.cat_id] ?? 0) + row.duration_min
      }
      setFoodTotals(foodSums)
      setPlayTotals(playSums)
    })
    return () => {
      cancelled = true
    }
    // catKey statt cats, damit sich der Effekt nicht bei jeder neuen Array-Referenz wiederholt
  }, [catKey, date]) // eslint-disable-line react-hooks/exhaustive-deps

  if (cats.length <= 1 && groups.length === 0) return null

  // Gleiche Rechnung wie der "Gesamt"-Wert in der Ringmitte (FitnessRings): Durchschnitt
  // aus Futter- und Spielzeit-Fortschritt, je auf 100% gedeckelt.
  function combinedPercent(catIds: string[]) {
    const foodCurrent = catIds.reduce((sum, id) => sum + (foodTotals[id] ?? 0), 0)
    const foodTarget = cats
      .filter((c) => catIds.includes(c.id))
      .reduce((sum, c) => sum + c.daily_food_target_g, 0)
    const playCurrent = catIds.reduce((sum, id) => sum + (playTotals[id] ?? 0), 0)
    const playTarget = cats
      .filter((c) => catIds.includes(c.id))
      .reduce((sum, c) => sum + c.daily_play_target_min, 0)
    const foodPercent = foodTarget > 0 ? Math.round((foodCurrent / foodTarget) * 100) : 0
    const playPercent = playTarget > 0 ? Math.round((playCurrent / playTarget) * 100) : 0
    return Math.round((Math.min(foodPercent, 100) + Math.min(playPercent, 100)) / 2)
  }

  function Avatar({ photoUrl, percent }: { photoUrl: string | null; percent: number }) {
    const color = ampelColor(percent)
    return (
      <span
        className="relative w-8 h-8 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${color} ${percent}%, var(--bg-input) 0)` }}
      >
        <span className="absolute inset-[3px] rounded-full bg-card overflow-hidden flex items-center justify-center">
          {photoUrl && (
            <img src={photoUrl} alt="" className="w-full h-full object-cover rounded-full" />
          )}
        </span>
      </span>
    )
  }

  return (
    <GlassCard className="p-3 mt-3 flex flex-col gap-1">
      <p className="text-[13px] text-text-secondary mb-1">Katzen &amp; Gruppen</p>
      {groups.map((group) => {
        const percent = combinedPercent(group.catIds)
        const isSelected = target?.type === 'group' && target.id === group.id
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelect({ type: 'group', id: group.id })}
            className={`flex items-center gap-3 min-h-[44px] px-2 rounded-control ${
              isSelected ? 'bg-input' : ''
            }`}
          >
            {group.photo_url ? (
              <Avatar photoUrl={group.photo_url} percent={percent} />
            ) : (
              <span className="w-8 h-8 shrink-0 rounded-full bg-input flex items-center justify-center text-text-secondary">
                <Users size={16} strokeWidth={1.75} />
              </span>
            )}
            <span className="flex-1 text-left text-text-primary">{group.name}</span>
            <span className="text-[13px] text-text-secondary">{percent}%</span>
          </button>
        )
      })}
      {cats.map((cat) => {
        const percent = combinedPercent([cat.id])
        const isSelected = target?.type === 'cat' && target.id === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect({ type: 'cat', id: cat.id })}
            className={`flex items-center gap-3 min-h-[44px] px-2 rounded-control ${
              isSelected ? 'bg-input' : ''
            }`}
          >
            <Avatar photoUrl={cat.photo_url} percent={percent} />
            <span className="flex-1 text-left text-text-primary">{cat.name}</span>
            <span className="text-[13px] text-text-secondary">{percent}%</span>
          </button>
        )
      })}
    </GlassCard>
  )
}
