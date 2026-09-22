import { NavLink } from 'react-router-dom'
import { Home, BarChart3, User, Settings, Plus } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'

const tabs = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/stats', label: 'Stats', Icon: BarChart3, end: false },
]

const tabsRight = [
  { to: '/profile', label: 'Profil', Icon: User, end: false },
  { to: '/settings', label: 'Einstellungen', Icon: Settings, end: false },
]

export default function BottomNav() {
  const { openQuickAdd } = useAppData()

  return (
    <nav className="glass fixed bottom-3 left-3 right-3 max-w-app mx-auto rounded-[24px]">
      <div className="flex items-center justify-around">
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              `flex items-center justify-center py-2 min-w-[44px] min-h-[44px] ${
                isActive ? 'text-apricot' : 'text-text-secondary'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.75} />
          </NavLink>
        ))}

        <button
          type="button"
          onClick={openQuickAdd}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-apricot text-text-on-color -translate-y-2"
          aria-label="Neuer Eintrag"
        >
          <Plus size={26} strokeWidth={2} />
        </button>

        {tabsRight.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              `flex items-center justify-center py-2 min-w-[44px] min-h-[44px] ${
                isActive ? 'text-apricot' : 'text-text-secondary'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.75} />
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
