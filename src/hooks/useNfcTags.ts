import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { NfcTag } from '../types'

export function useNfcTags(householdId: string | null) {
  const [tags, setTags] = useState<NfcTag[]>([])
  const [loading, setLoading] = useState(false)
  const [reloadCount, setReloadCount] = useState(0)

  const refresh = useCallback(() => setReloadCount((c) => c + 1), [])

  useEffect(() => {
    if (!householdId) {
      setTags([])
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('nfc_tags')
      .select('*')
      .eq('household_id', householdId)
      .then(({ data }) => {
        if (cancelled) return
        setTags((data as NfcTag[]) ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [householdId, reloadCount])

  async function addTag(tagIdentifier: string, foodTypeId: string, label: string) {
    if (!householdId) return
    const { error } = await supabase.from('nfc_tags').insert({
      household_id: householdId,
      tag_identifier: tagIdentifier,
      food_type_id: foodTypeId,
      label: label || null,
    })
    if (error) throw error
    refresh()
  }

  async function deleteTag(id: string) {
    const { error } = await supabase.from('nfc_tags').delete().eq('id', id)
    if (error) throw error
    refresh()
  }

  return { tags, loading, addTag, deleteTag, refresh }
}
