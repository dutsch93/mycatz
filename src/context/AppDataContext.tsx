import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useHouseholdData } from '../hooks/useHouseholdData'
import { useDayLogs } from '../hooks/useDayLogs'
import { todayIso } from '../lib/dates'

export type Target = { type: 'cat'; id: string } | { type: 'group'; id: string }

const TARGET_STORAGE_KEY = 'mycatz_selected_target'

interface AppDataValue extends ReturnType<typeof useHouseholdData>, ReturnType<typeof useDayLogs> {
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
