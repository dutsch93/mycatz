import type { ReactNode } from 'react'
import Header from './Header'
import BottomNav from './BottomNav'
import FeedingQuickAdd from '../feeding/FeedingQuickAdd'
import { useAppData } from '../../context/AppDataContext'

export default function Shell({ children }: { children: ReactNode }) {
  const {
    foodTypes,
    quickAddOpen,
    closeQuickAdd,
    logFeeding,
    logPlay,
    logWeight,
    logNote,
    nfcPulse,
  } = useAppData()

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-app mx-auto">
        <Header />
        <main className="px-4 pb-24">{children}</main>
      </div>
      <BottomNav />
      {nfcPulse && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[90%] px-4 py-2 rounded-control bg-apricot text-text-on-color text-[13px] text-center animate-pulse">
          📶 {nfcPulse}
        </div>
      )}
      <FeedingQuickAdd
        open={quickAddOpen}
        onClose={closeQuickAdd}
        foodTypes={foodTypes}
        onLogFeeding={logFeeding}
        onLogPlay={logPlay}
        onLogWeight={logWeight}
        onLogNote={logNote}
      />
    </div>
  )
}
