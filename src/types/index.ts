// TypeScript-Typen passend zum Supabase-Schema (supabase/migrations/001_initial_schema.sql)

export type ProfileRole = 'owner' | 'member' | 'guest'

export type FoodCategory =
  | 'wet'
  | 'dry'
  | 'sensitive'
  | 'cooked'
  | 'snack_dry'
  | 'snack_wet'
  | 'custom'

export type HabitType = 'boolean' | 'count' | 'select'
export type HabitCategory = 'daily' | 'health' | 'behavior'
export type FeedingSource = 'manual' | 'nfc'

export interface Household {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  household_id: string | null
  display_name: string
  role: ProfileRole
  avatar_url: string | null
  created_at: string
}

export interface Cat {
  id: string
  household_id: string
  name: string
  age: string | null
  breed: string | null
  weight_kg: number | null
  photo_url: string | null
  tags: string[] | null
  daily_food_target_g: number
  daily_play_target_min: number
  created_at: string
  archived: boolean
}

export interface CatGroup {
  id: string
  household_id: string
  name: string
  photo_url: string | null
  created_at: string
}

export interface FoodType {
  id: string
  household_id: string
  name: string
  category: FoodCategory
  default_portion_g: number
  sort_order: number
  created_at: string
}

export interface HabitDefinition {
  id: string
  household_id: string
  name: string
  emoji: string | null
  type: HabitType
  options: string[] | null
  has_required_count: boolean
  is_default: boolean
  sort_order: number
  category: HabitCategory
  created_at: string
}
