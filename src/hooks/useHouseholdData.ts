import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Cat, CatGroup, FoodType, HabitDefinition, Household, Profile } from '../types'

export interface CatGroupWithMembers extends CatGroup {
  catIds: string[]
}

interface HouseholdData {
  profile: Profile | null
  household: Household | null
  cats: Cat[]
  groups: CatGroupWithMembers[]
  foodTypes: FoodType[]
  habits: HabitDefinition[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useHouseholdData(userId: string | null): HouseholdData {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [cats, setCats] = useState<Cat[]>([])
  const [groups, setGroups] = useState<CatGroupWithMembers[]>([])
  const [foodTypes, setFoodTypes] = useState<FoodType[]>([])
  const [habits, setHabits] = useState<HabitDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  const refresh = useCallback(() => setReloadCount((c) => c + 1), [])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: profileRow, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (profileError) throw profileError
        if (cancelled) return
        setProfile(profileRow as Profile)

        const householdId = (profileRow as Profile).household_id
        if (!householdId) {
          setHousehold(null)
          setCats([])
          setGroups([])
          setFoodTypes([])
          setHabits([])
          return
        }

        const [householdRes, catsRes, groupsRes, membersRes, foodRes, habitsRes] =
          await Promise.all([
            supabase.from('households').select('*').eq('id', householdId).single(),
            supabase
              .from('cats')
              .select('*')
              .eq('household_id', householdId)
              .eq('archived', false)
              .order('created_at'),
            supabase.from('cat_groups').select('*').eq('household_id', householdId),
            supabase.from('cat_group_members').select('group_id, cat_id'),
            supabase
              .from('food_types')
              .select('*')
              .eq('household_id', householdId)
              .order('sort_order'),
            supabase
              .from('habit_definitions')
              .select('*')
              .eq('household_id', householdId)
              .order('sort_order'),
          ])

        if (cancelled) return
        if (householdRes.error) throw householdRes.error
        if (catsRes.error) throw catsRes.error
        if (groupsRes.error) throw groupsRes.error
        if (membersRes.error) throw membersRes.error
        if (foodRes.error) throw foodRes.error
        if (habitsRes.error) throw habitsRes.error

        const members = (membersRes.data ?? []) as { group_id: string; cat_id: string }[]
        const groupsWithMembers: CatGroupWithMembers[] = (groupsRes.data as CatGroup[]).map(
          (g) => ({
            ...g,
            catIds: members.filter((m) => m.group_id === g.id).map((m) => m.cat_id),
          }),
        )

        setHousehold(householdRes.data as Household)
        setCats(catsRes.data as Cat[])
        setGroups(groupsWithMembers)
        setFoodTypes(foodRes.data as FoodType[])
        setHabits(habitsRes.data as HabitDefinition[])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Daten konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId, reloadCount])

  return { profile, household, cats, groups, foodTypes, habits, loading, error, refresh }
}
