// Hält die Wizard-Eingaben, bis die Magic-Link-E-Mail bestätigt wurde.
// Wird in localStorage zwischengespeichert, weil der Browser beim Klick
// auf den Magic Link neu geladen wird.
import type { FoodCategory, HabitCategory, HabitType } from '../types'

const STORAGE_KEY = 'mycatz_onboarding_draft'

export interface DraftCat {
  localId: string
  name: string
  age: string
  breed: string
  weightKg: string
  tags: string[]
  dailyFoodTargetG: number
  dailyPlayTargetMin: number
}

export interface DraftFoodType {
  localId: string
  name: string
  category: FoodCategory
  defaultPortionG: number
  selected: boolean
}

export interface DraftHabit {
  localId: string
  emoji: string
  name: string
  type: HabitType
  options?: string[]
  hasRequiredCount: boolean
  category: HabitCategory
  selected: boolean
}

export interface OnboardingDraft {
  householdName: string
  ownerName: string
  ownerEmail: string
  cats: DraftCat[]
  createGroup: boolean
  groupName: string
  foodTypes: DraftFoodType[]
  habits: DraftHabit[]
  playTargetMin: number
}

export function createEmptyDraft(): OnboardingDraft {
  return {
    householdName: '',
    ownerName: '',
    ownerEmail: '',
    cats: [],
    createGroup: false,
    groupName: '',
    foodTypes: [],
    habits: [],
    playTargetMin: 15,
  }
}

export function saveDraft(draft: OnboardingDraft) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

export function loadDraft(): OnboardingDraft | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as OnboardingDraft
  } catch {
    return null
  }
}

export function clearDraft() {
  localStorage.removeItem(STORAGE_KEY)
}

export function makeLocalId() {
  return crypto.randomUUID()
}
