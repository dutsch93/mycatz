import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FeedingLog, HabitLog, Note, PlayLog } from '../types'

// Lädt und schreibt die Logs für eine Menge von Katzen-IDs (eine Katze oder alle Mitglieder
// einer Gruppe) an einem bestimmten Tag. Bei Gruppen wird laut CLAUDE.md pro Katze ein
// eigener, voller Eintrag erzeugt (kein Aufteilen der Menge).

export function useDayLogs(catIds: string[], date: string, userId: string | null) {
  const [feedingLogs, setFeedingLogs] = useState<FeedingLog[]>([])
  const [playLogs, setPlayLogs] = useState<PlayLog[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [reloadCount, setReloadCount] = useState(0)

  const refresh = useCallback(() => setReloadCount((c) => c + 1), [])

  const catKey = catIds.slice().sort().join(',')

  useEffect(() => {
    if (catIds.length === 0) {
      setFeedingLogs([])
      setPlayLogs([])
      setHabitLogs([])
      setNotes([])
      return
    }
    let cancelled = false

    async function load() {
      setLoading(true)
      const [feedRes, playRes, habitRes, notesRes] = await Promise.all([
        supabase.from('feeding_logs').select('*').in('cat_id', catIds).eq('date', date),
        supabase.from('play_logs').select('*').in('cat_id', catIds).eq('date', date),
        supabase.from('habit_logs').select('*').in('cat_id', catIds).eq('date', date),
        supabase.from('notes').select('*').in('cat_id', catIds).eq('date', date),
      ])
      if (cancelled) return
      setFeedingLogs((feedRes.data as FeedingLog[]) ?? [])
      setPlayLogs((playRes.data as PlayLog[]) ?? [])
      setHabitLogs((habitRes.data as HabitLog[]) ?? [])
      setNotes((notesRes.data as Note[]) ?? [])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
    // catKey statt catIds, damit sich der Effekt nicht bei jedem Render (neue Array-Referenz) wiederholt
  }, [catKey, date, reloadCount]) // eslint-disable-line react-hooks/exhaustive-deps

  async function logFeeding(foodTypeId: string, amountG: number, note?: string) {
    const rows = catIds.map((catId) => ({
      cat_id: catId,
      food_type_id: foodTypeId,
      amount_g: amountG,
      logged_by: userId,
      source: 'manual' as const,
      date,
      note: note || null,
    }))
    const { error } = await supabase.from('feeding_logs').insert(rows)
    if (error) throw error
    refresh()
  }

  async function logPlay(durationMin: number, note?: string) {
    const rows = catIds.map((catId) => ({
      cat_id: catId,
      duration_min: durationMin,
      logged_by: userId,
      date,
      note: note || null,
    }))
    const { error } = await supabase.from('play_logs').insert(rows)
    if (error) throw error
    refresh()
  }

  async function logWeight(weightKg: number) {
    const rows = catIds.map((catId) => ({
      cat_id: catId,
      weight_kg: weightKg,
      date,
      logged_by: userId,
    }))
    const { error } = await supabase.from('weight_logs').insert(rows)
    if (error) throw error
    refresh()
  }

  // Habit-Eintrag pro Katze setzen (upsert wegen UNIQUE(cat_id, habit_id, date) — das macht
  // vergangene Tage direkt editierbar: erneutes Loggen überschreibt den bestehenden Eintrag).
  async function logHabit(
    habitId: string,
    value: boolean,
    extra?: { count?: number | null; selectedOption?: string | null; note?: string | null },
  ) {
    const rows = catIds.map((catId) => ({
      cat_id: catId,
      habit_id: habitId,
      date,
      value,
      count: extra?.count ?? null,
      selected_option: extra?.selectedOption ?? null,
      note: extra?.note ?? null,
      logged_by: userId,
    }))
    const { error } = await supabase
      .from('habit_logs')
      .upsert(rows, { onConflict: 'cat_id,habit_id,date' })
    if (error) throw error
    refresh()
  }

  async function logNote(text: string) {
    const rows = catIds.map((catId) => ({
      cat_id: catId,
      text,
      date,
      logged_by: userId,
    }))
    const { error } = await supabase.from('notes').insert(rows)
    if (error) throw error
    refresh()
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) throw error
    refresh()
  }

  async function deleteFeedingLog(id: string) {
    const { error } = await supabase.from('feeding_logs').delete().eq('id', id)
    if (error) throw error
    refresh()
  }

  async function deletePlayLog(id: string) {
    const { error } = await supabase.from('play_logs').delete().eq('id', id)
    if (error) throw error
    refresh()
  }

  return {
    feedingLogs,
    playLogs,
    habitLogs,
    notes,
    loading,
    refresh,
    logFeeding,
    logPlay,
    logWeight,
    logHabit,
    logNote,
    deleteFeedingLog,
    deletePlayLog,
    deleteNote,
  }
}
