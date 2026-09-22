import { Check, Users } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import GlassCard from '../components/shared/GlassCard'

export default function Profile() {
  const { cats, groups, target, setTarget } = useAppData()

  return (
    <div className="py-6 flex flex-col gap-4">
      <h2>Profil</h2>
      <p className="text-[13px] text-text-secondary">
        Wählt aus, welche Katze oder Gruppe auf dem Home-Screen getrackt wird.
      </p>

      <div className="flex flex-col gap-2">
        {cats.map((cat) => {
          const isSelected = target?.type === 'cat' && target.id === cat.id
          return (
            <GlassCard
              key={cat.id}
              className={`flex items-center justify-between min-h-[44px] px-3 ${
                isSelected ? 'bg-input' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setTarget({ type: 'cat', id: cat.id })}
                className="flex-1 flex items-center justify-between min-h-[44px]"
              >
                <span>{cat.name}</span>
                {isSelected && <Check size={18} className="text-apricot" />}
              </button>
            </GlassCard>
          )
        })}

        {groups.map((group) => {
          const isSelected = target?.type === 'group' && target.id === group.id
          return (
            <GlassCard
              key={group.id}
              className={`flex items-center justify-between min-h-[44px] px-3 ${
                isSelected ? 'bg-input' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setTarget({ type: 'group', id: group.id })}
                className="flex-1 flex items-center gap-2 justify-between min-h-[44px]"
              >
                <span className="flex items-center gap-2">
                  <Users size={16} strokeWidth={1.75} />
                  {group.name}
                </span>
                {isSelected && <Check size={18} className="text-apricot" />}
              </button>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
