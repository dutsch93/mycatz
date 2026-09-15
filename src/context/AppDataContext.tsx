import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useHouseholdData } from '../hooks/useHouseholdData'
import { useDayLogs } from '../hooks/useDayLogs'
import { useNfcTags } from '../hooks/useNfcTags'
import { useRealtime } from '../hooks/useRealtime'
import { todayIso } from '../lib/dates'
import { NFC_QUERY_PARAM } from '../lib/nfc'
import { supabase } from '../lib/supabase'
import type { FoodCategory, NfcTag } from '../types'

export type Target = { type: 'cat'; id: string } | { type: 'group'; id: string }

const TARGET_STORAGE_KEY = 'mycatz_selected_target'

interface AppDataValue
  extends ReturnType<typeof useHouseholdData>,
    ReturnType<typeof useDayLogs>,
    Pick<ReturnType<typeof useNfcTags>, 'addTag' | 'deleteTag'> {
  userId: string | null
  authLoading: boolean
  target: Target | null
  setTarget: (t: Target) => void
  catIdsForTarget: string[]
  selectedDate: string
  setSelectedDate: (d: string) => void
  quickAddOpen: boolean
  openQuickAdd: () => void
  closeQuickAdd: () => void
  nfcTags: NfcTag[]
  nfcPulse: string | null
  logNfcTag: (tagIdentifier: string) => Promise<void>
  addFoodType: (name: string, category: FoodCategory, defaultPortionG: number) => Promise<void>
  updateFoodTypePortion: (id: string, defaultPortionG: number) => Promise<void>
  deleteFoodType: (id: string) => Promise<void>
}

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { userId, loading: authLoading } = useAuth()
  const householdData = useHouseholdData(userId)
  const [target, setTargetState] = useState<Target | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const catIdsForTarget = useMemo(() => {
    if (!target) return []
    if (target.type === 'cat') return [target.id]
    return householdData.groups.find((g) => g.id === target.id)?.catIds ?? []
  }, [target, householdData.groups])

  const dayLogs = useDayLogs(catIdsForTarget, selectedDate, userId)
  const nfcTagsData = useNfcTags(householdData.household?.id ?? null)
  const [nfcPulse, setNfcPulse] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useRealtime(catIdsForTarget, dayLogs.refresh)

  async function logNfcTag(tagIdentifier: string) {
    const tag = nfcTagsData.tags.find((t) => t.tag_identifier === tagIdentifier)
    if (!tag) {
      setNfcPulse('Unbekannter NFC-Tag. Bitte in den Einstellungen einrichten.')
      setTimeout(() => setNfcPulse(null), 2500)
      return
    }
    const foodType = householdData.foodTypes.find((f) => f.id === tag.food_type_id)
    if (!foodType) return
    await dayLogs.logFeeding(foodType.id, foodType.default_portion_g)
    setNfcPulse(`${foodType.name} geloggt (${foodType.default_portion_g}g)`)
    setTimeout(() => setNfcPulse(null), 2000)
  }

  async function addFoodType(name: string, category: FoodCategory, defaultPortionG: number) {
    const householdId = householdData.household?.id
    if (!householdId) return
    const { error } = await supabase.from('food_types').insert({
      household_id: householdId,
      name,
      category,
      default_portion_g: defaultPortionG,
      sort_order: householdData.foodTypes.length,
    })
    if (error) throw error
    householdData.refresh()
  }

  async function updateFoodTypePortion(id: string, defaultPortionG: number) {
    const { error } = await supabase
      .from('food_types')
      .update({ default_portion_g: defaultPortionG })
      .eq('id', id)
    if (error) throw error
    householdData.refresh()
  }

  async function deleteFoodType(id: string) {
    const { error } = await supabase.from('food_types').delete().eq('id', id)
    if (error) throw error
    householdData.refresh()
  }

  // iOS-Shortcut-Fallback: öffnet die App mit ?nfc=TAG_ID statt Web NFC zu nutzen.
  useEffect(() => {
    const tagId = searchParams.get(NFC_QUERY_PARAM)
    if (!tagId || catIdsForTarget.length === 0 || nfcTagsData.tags.length === 0) return
    logNfcTag(tagId)
    const next = new URLSearchParams(searchParams)
    next.delete(NFC_QUERY_PARAM)
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, catIdsForTarget.length, nfcTagsData.tags.length])

  // Sobald Katzen geladen sind: gespeicherte Auswahl übernehmen oder erste Katze wählen.
  useEffect(() => {
    if (target || householdData.cats.length === 0) return
    const stored = localStorage.getItem(TARGET_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Target
        const stillExists =
          parsed.type === 'cat'
            ? householdData.cats.some((c) => c.id === parsed.id)
            : householdData.groups.some((g) => g.id === parsed.id)
        if (stillExists) {
          setTargetState(parsed)
          return
        }
      } catch {
        // ignorieren, Fallback unten
      }
    }
    setTargetState({ type: 'cat', id: householdData.cats[0].id })
  }, [target, householdData.cats, householdData.groups])

  function setTarget(t: Target) {
    setTargetState(t)
    localStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(t))
  }

  return (
    <AppDataContext.Provider
      value={{
        userId,
        authLoading,
        ...householdData,
        ...dayLogs,
        target,
        setTarget,
        catIdsForTarget,
        selectedDate,
        setSelectedDate,
        quickAddOpen,
        openQuickAdd: () => setQuickAddOpen(true),
        closeQuickAdd: () => setQuickAddOpen(false),
        nfcTags: nfcTagsData.tags,
        addTag: nfcTagsData.addTag,
        deleteTag: nfcTagsData.deleteTag,
        nfcPulse,
        logNfcTag,
        addFoodType,
        updateFoodTypePortion,
        deleteFoodType,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData muss innerhalb von AppDataProvider verwendet werden')
  return ctx
}
