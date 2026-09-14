import type { ReactNode } from 'react'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-app mx-auto">
        <Header />
        <main className="px-4 pb-24">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
