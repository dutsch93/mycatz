import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'

export default function Header() {
  const { target, cats, groups } = useAppData()

  const activeCat = target?.type === 'cat' ? cats.find((c) => c.id === target.id) : undefined
  const activeGroup = target?.type === 'group' ? groups.find((g) => g.id === target.id) : undefined
  const name = activeCat?.name ?? activeGroup?.name
  const photoUrl = activeCat?.photo_url ?? activeGroup?.photo_url ?? null

  return (
    <header className="glass flex items-center justify-between px-4 py-3 mt-3 mb-2 rounded-[24px]">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-input overflow-hidden">
          {photoUrl && <img src={photoUrl} alt="" className="w-full h-full object-cover" />}
        </div>
        <h1 className="text-text-primary">{name ?? 'MyCatz'}</h1>
      </div>
      <Link
        to="/profile"
        className="w-11 h-11 flex items-center justify-center rounded-full text-text-secondary"
        aria-label="Profil"
      >
        <User size={22} strokeWidth={1.75} />
      </Link>
    </header>
  )
}
