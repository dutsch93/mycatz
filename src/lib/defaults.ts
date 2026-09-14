// Vorbefüllte Vorschläge für den Onboarding-Wizard (siehe CLAUDE.md)
import type { FoodCategory, HabitCategory, HabitType } from '../types'

export interface DefaultFoodType {
  name: string
  category: FoodCategory
  defaultPortionG: number
}

export const DEFAULT_FOOD_TYPES: DefaultFoodType[] = [
  { name: 'Nassfutter', category: 'wet', defaultPortionG: 100 },
  { name: 'Trockenfutter', category: 'dry', defaultPortionG: 30 },
  { name: 'Sensitives Futter', category: 'sensitive', defaultPortionG: 100 },
  { name: 'Gekochtes Hähnchen', category: 'cooked', defaultPortionG: 50 },
  { name: 'Snacks trocken', category: 'snack_dry', defaultPortionG: 10 },
  { name: 'Snacks nass', category: 'snack_wet', defaultPortionG: 15 },
]

export interface DefaultHabit {
  emoji: string
  name: string
  type: HabitType
  options?: string[]
  hasRequiredCount?: boolean
  category: HabitCategory
}

export const DEFAULT_HABITS: DefaultHabit[] = [
  { emoji: '🤗', name: 'Gekuschelt', type: 'boolean', category: 'daily' },
  { emoji: '✂️', name: 'Gebürstet', type: 'boolean', category: 'daily' },
  { emoji: '🚽', name: 'Katzenklo gereinigt', type: 'boolean', category: 'daily' },
  { emoji: '💊', name: 'Medikament gegeben', type: 'boolean', category: 'health' },
  { emoji: '💧', name: 'Trinkmenge', type: 'count', category: 'daily' },
  {
    emoji: '😺',
    name: 'Stimmung',
    type: 'select',
    options: ['entspannt', 'verspielt', 'ängstlich', 'aggressiv', 'apathisch'],
    category: 'daily',
  },
  { emoji: '🤮', name: 'Erbrochen', type: 'count', category: 'health' },
  { emoji: '💩', name: 'Durchfall', type: 'count', category: 'health' },
  { emoji: '🤧', name: 'Niesen', type: 'count', category: 'health' },
  { emoji: '🧶', name: 'Haarballen', type: 'count', category: 'health' },
  { emoji: '🎯', name: 'Markiert / Angepinkelt', type: 'count', category: 'behavior' },
  { emoji: '🏥', name: 'Tierarztbesuch', type: 'boolean', category: 'health' },
  { emoji: '⚠️', name: 'Ungewöhnl. Verhalten', type: 'boolean', category: 'behavior' },
  { emoji: '✂️', name: 'Krallen geschnitten', type: 'boolean', category: 'daily' },
]
