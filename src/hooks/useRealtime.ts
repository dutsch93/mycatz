import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Abonniert Live-Änderungen an den Log-Tabellen für die aktuell ausgewählten Katzen.
// Wenn Person A auf einem anderen Gerät einen Eintrag macht, ruft `onChange` hier auf,
// damit die Ringe/Habits sofort aktualisiert werden (siehe CLAUDE.md "Realtime").
export function useRealtime(catIds: string[], onChange: () => void) {
  const filterKey = catIds.slice().sort().join(',')

  useEffect(() => {
    if (catIds.length === 0) return
    const filter = `cat_id=in.(${catIds.join(',')})`

    const channel = supabase
      .channel(`logs-${filterKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feeding_logs', filter }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'play_logs', filter }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs', filter }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter }, onChange)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])
}
