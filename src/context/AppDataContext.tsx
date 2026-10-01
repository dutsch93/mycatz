import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useHouseholdData } from '../hooks/useHouseholdData'
import { useDayLogs } from '../hooks/useDayLogs'
import { useNfcTags } from '../hooks/useNfcTags'
import { useRealtime } from '../hooks/useRealtime'
import { useMembership } from '../hooks/useMembership'
import { todayIso } from '../lib/dates'
import { NFC_QUERY_PARAM } from '../lib/nfc'
import { supabase } from '../lib/supabase'
import type { Cat, FoodCategory, HabitCategory, HabitType, NfcTag } from '../types'

export type Target = { type: 'cat'; id: string } | { type: 'group'; id: string }

const TARGET_STORAGE_KEY = 'mycatz_selected_target'

interface AppDataValue
  extends Omit<ReturnType<typeof useHouseholdData>, 'loading' | 'refresh'>,
    Omit<ReturnType<typeof useDayLogs>, 'loading' | 'refresh'>,
    Pick<ReturnType<typeof useNfcTags>, 'addTag' | 'deleteTag'>,
    ReturnType<typeof useMembership> {
  userId: string | null
  isOwner: boolean
  authLoading: boolean
  // "loading"/"refresh" beziehen sich auf die Haushaltsdaten (Katzen, Futterarten, Habits) —
  // die gleichnamigen Felder aus useDayLogs sind unten explizit umbenannt, damit sie sich beim
  // Zusammenführen nicht überschreiben (siehe AppDataProvider).
  loading: boolean
  refresh: () => void
  dayLogsLoading: boolean
  refreshDayLogs: () => void
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
  addCat: (cat: {
    name: string
    age: string
    breed: string
    weightKg: number | null
    tags: string[]
    dailyFoodTargetG: number
    dailyPlayTargetMin: number
  }) => Promise<void>
  updateCat: (id: string, patch: Partial<Pick<Cat, 'name' | 'age' | 'breed' | 'weight_kg' | 'tags' | 'daily_food_target_g' | 'daily_play_target_min'>>) => Promise<void>
  archiveCat: (id: string) => Promise<void>
  setCatHabitEnabled: (catId: string, habitId: string, enabled: boolean) => Promise<void>
  addGroup: (name: string, catIds: string[]) => Promise<void>
  renameGroup: (id: string, name: string) => Promise<void>
  setGroupMembers: (id: string, catIds: string[]) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  addHabit: (habit: {
    name: string
    type: HabitType
    options: string[]
    category: HabitCategory
  }) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
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

  const { loading: dayLogsLoading, refresh: refreshDayLogs, ...dayLogs } = useDayLogs(
    catIdsForTarget,
    selectedDate,
    userId,
  )
  const nfcTagsData = useNfcTags(householdData.household?.id ?? null)
  const isOwner = householdData.profile?.role === 'owner'
  const membership = useMembership(householdData.household?.id ?? null, isOwner)
  const [nfcPulse, setNfcPulse] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useRealtime(catIdsForTarget, refreshDayLogs)

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
    if (error) throw new Error(error.message)
    householdData.refresh()
  }

  async function updateFoodTypePortion(id: string, defaultPortionG: number) {
    const { error } = await supabase
      .from('food_types')
      .update({ default_portion_g: defaultPortionG })
      .eq('id', id)
    if (error) throw new Error(error.message)
    householdData.refresh()
  }

  async function deleteFoodType(id: string) {
    const { error } = await supabase.from('food_types').delete().eq('id', id)
    if (error) throw new Error(error.message)
    householdData.refresh()
  }

  async function addCat(cat: {
    name: string
    age: string
    breed: string
    weightKg: number | null
    tags: string[]
    dailyFoodTargetG: number
    dailyPlayTargetMin: number
  }) {
    const householdId = householdData.household?.id
    if (!householdId) return
    const { error } = await supabase.from('cats').insert({
      household_id: householdId,
      name: cat.name,
      age: cat.age || null,
      breed: cat.breed || null,
      weight_kg: cat.weightKg,
      tags: cat.tags,
      daily_food_target_g: cat.dailyFoodTargetG,
      daily_play_target_min: cat.dailyPlayTargetMin,
    })
    if (error) throw new Error(error.message)
    householdData.refresh()
  }

  async function updateCat(
    id: string,
    patch: Partial<
      Pick<
        Cat,
        'name' | 'age' | 'breed' | 'weight_kg' | 'tags' | 'daily_food_target_g' | 'daily_play_target_min'
      >
    >,
  ) {
    const { error } = await supabase.from('cats').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    householdData.refresh()
  }

  async function archiveCat(id: string) {
    const { error } = await supabase.from('cats').update({ archived: true }).eq('id', id)
    if (error) throw new Error(error.message)
    householdData.refresh()
  }

  async function setCatHabitEnabled(catId: string, habitId: string, enabled: boolean) {
    if (enabled) {
      const { error } = await supabase
        .from('cat_habit_exclusions')
        .delete()
        .eq('cat_id', catId)
        .eq('habit_id', habitId)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from('cat_habit_exclusions')
        .insert({ cat_id: catId, habit_id: habitId })
      if (error) throw new Error(error.message)
    }
    householdData.refresh()
  }

  async function addGroup(name: string, catIds: string[]) {
    const householdId = householdData.household?.id
    if (!householdId) return
    const { data, error } = await supabase
      .from('cat_groups')
      .insert({ household_id: householdId, name })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const groupId = (data as { id: string }).id
    if (catIds.length > 0) {
      const { error: membersError } = await supabase
        .from('cat_group_members')
        .insert(catIds.map((catId) => ({ group_id: groupId, cat_id: catId })))
      if (membersError) throw new Error(membersError.message)
    }
    householdData.refresh()
  }

  async function renameGroup(id: string, name: string) {
    const { error } = await supabase.from('cat_groups').update({ name }).eq('id', id)
    if (error) throw new Error(error.message)
    householdData.refresh()
  }

  async function setGroupMembers(id: string, catIds: string[]) {
    const { error: deleteError } = await supabase
      .from('cat_group_members')
      .delete()
      .eq('group_id', id)
    if (deleteError) throw new Error(deleteError.message)
    if (catIds.length > 0) {
      const { error: insertError } = await supabase
        .from('cat_group_members')
        .insert(catIds.map((catId) => ({ group_id: id, cat_id: catId })))
      if (insertError) throw new Error(insertError.message)
    }
    householdData.refresh()
  }

  async function deleteGroup(id: string) {
    const { error } = await supabase.from('cat_groups').delete().eq('id', id)
    if (error) throw new Error(error.message)
    householdData.refresh()
  }

  async function addHabit(habit: {
    name: string
    type: HabitType
    options: string[]
    category: HabitCategory
  }) {
    const householdId = householdData.household?.id
    if (!householdId) return
    const { error } = await supabase.from('habit_definitions').insert({
      household_id: householdId,
      name: habit.name,
      type: habit.type,
      options: habit.type === 'select' ? habit.options : null,
      category: habit.category,
      is_default: true,
      sort_order: householdData.habits.length,
    })
    if (error) throw new Error(error.message)
    householdData.refresh()
  }

  async function deleteHabit(id: string) {
    const { error } = await supabase.from('habit_definitions').delete().eq('id', id)
    if (error) throw new Error(error.message)
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
        isOwner,
        ...householdData,
        ...membership,
        ...dayLogs,
        dayLogsLoading,
        refreshDayLogs,
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
        addCat,
        updateCat,
        archiveCat,
        setCatHabitEnabled,
        addGroup,
        renameGroup,
        setGroupMembers,
        deleteGroup,
        addHabit,
        deleteHabit,
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
