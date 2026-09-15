import type { ReactNode } from 'react'
import Header from './Header'
import BottomNav from './BottomNav'
import FeedingQuickAdd from '../feeding/FeedingQuickAdd'
import { useAppData } from '../../context/AppDataContext'

export default function Shell({ children }: { children: ReactNode }) {
  const { foodTypes, quickAddOpen, closeQuickAdd, logFeeding, logPlay, logWeight } = useAppData()

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-app mx-auto">
        <Header />
        <main className="px-4 pb-24">{children}</main>
      </div>
      <BottomNav />
      <FeedingQuickAdd
        open={quickAddOpen}
        onClose={closeQuickAdd}
        foodTypes={foodTypes}
        onLogFeeding={logFeeding}
        onLogPlay={logPlay}
        onLogWeight={logWeight}
      />
    </div>
  )
}
