import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'

export default function Header() {
  const { target, cats, groups } = useAppData()

  const name =
    target?.type === 'cat'
      ? cats.find((c) => c.id === target.id)?.name
      : groups.find((g) => g.id === target?.id)?.name

  return (
    <header className="glass flex items-center justify-between px-4 py-3 mt-3 mb-2 rounded-[24px]">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-input" />
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
