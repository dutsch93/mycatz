import type { ReactNode } from 'react'

export default function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="glass relative w-full max-w-app p-4 pb-8 max-h-[85vh] overflow-y-auto"
        style={{ borderRadius: '24px 24px 0 0' }}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
        {children}
      </div>
    </div>
  )
}
