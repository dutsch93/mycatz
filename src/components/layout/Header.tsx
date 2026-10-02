import { Users } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import type { Target } from '../../context/AppDataContext'

function targetKey(t: Target) {
  return `${t.type}:${t.id}`
}

// Header als Profil-Tableiste: jede Katze/Gruppe ist ein Tab (Avatar + Name
// darunter), horizontal scrollbar wie ein Carousel. Tap wählt das Profil und
// hebt es farblich hervor — ersetzt das vorherige Dropdown.
export default function Header() {
  const { target, cats, groups, setTarget } = useAppData()

  // Gruppen stehen immer an erster Stelle, danach die einzelnen Katzen.
  const profiles = [
    ...groups.map((g) => ({
      key: targetKey({ type: 'group' as const, id: g.id }),
      target: { type: 'group' as const, id: g.id },
      name: g.name,
      photoUrl: g.photo_url,
      isGroup: true,
    })),
    ...cats.map((c) => ({
      key: targetKey({ type: 'cat' as const, id: c.id }),
      target: { type: 'cat' as const, id: c.id },
      name: c.name,
      photoUrl: c.photo_url,
      isGroup: false,
    })),
  ]

  if (profiles.length === 0) return null

  return (
    <header className="glass flex items-center justify-center gap-4 px-4 py-3 mt-3 mb-2 rounded-[24px] overflow-x-auto">
      {profiles.map((p) => {
        const isSelected = target ? p.key === targetKey(target) : false
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => setTarget(p.target)}
            className="shrink-0 flex flex-col items-center gap-1"
            aria-label={p.name}
            aria-current={isSelected}
          >
            <span
              className={`relative w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-input transition-all ${
                isSelected ? 'ring-2 ring-apricot' : 'opacity-50'
              }`}
            >
              {p.photoUrl ? (
                <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : p.isGroup ? (
                <Users size={18} strokeWidth={1.75} className="text-text-secondary" />
              ) : (
                <span className="text-[15px] text-text-secondary">
                  {p.name[0]?.toUpperCase()}
                </span>
              )}
            </span>
            <span
              className={`text-[13px] max-w-[64px] truncate ${
                isSelected ? 'text-text-primary' : 'text-text-secondary'
              }`}
            >
              {p.name}
            </span>
          </button>
        )
      })}
    </header>
  )
}
