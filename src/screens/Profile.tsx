import { useAppData } from '../context/AppDataContext'

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
            <button
              key={cat.id}
              type="button"
              onClick={() => setTarget({ type: 'cat', id: cat.id })}
              className={`flex items-center justify-between min-h-[44px] px-3 rounded-card border-[0.5px] ${
                isSelected ? 'border-apricot bg-input' : 'border-border bg-card'
              }`}
            >
              <span>{cat.name}</span>
              {isSelected && <span className="text-apricot">✓</span>}
            </button>
          )
        })}

        {groups.map((group) => {
          const isSelected = target?.type === 'group' && target.id === group.id
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setTarget({ type: 'group', id: group.id })}
              className={`flex items-center justify-between min-h-[44px] px-3 rounded-card border-[0.5px] ${
                isSelected ? 'border-apricot bg-input' : 'border-border bg-card'
              }`}
            >
              <span>👥 {group.name}</span>
              {isSelected && <span className="text-apricot">✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
