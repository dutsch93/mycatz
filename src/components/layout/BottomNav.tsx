import { NavLink } from 'react-router-dom'
import { useAppData } from '../../context/AppDataContext'

const tabs = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/stats', label: 'Stats', icon: '📊', end: false },
]

const tabsRight = [
  { to: '/profile', label: 'Profil', icon: '👤', end: false },
  { to: '/settings', label: 'Einstellungen', icon: '⚙️', end: false },
]

export default function BottomNav() {
  const { openQuickAdd } = useAppData()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-[0.5px] border-border">
      <div className="max-w-app mx-auto flex items-center justify-around">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            aria-label={tab.label}
            className={({ isActive }) =>
              `flex items-center justify-center py-2 min-w-[44px] min-h-[44px] ${
                isActive ? 'text-apricot' : 'text-text-secondary'
              }`
            }
          >
            <span className="text-xl leading-none">{tab.icon}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={openQuickAdd}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-apricot text-text-on-color text-2xl leading-none -translate-y-2"
          aria-label="Neuer Eintrag"
        >
          ＋
        </button>

        {tabsRight.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            aria-label={tab.label}
            className={({ isActive }) =>
              `flex items-center justify-center py-2 min-w-[44px] min-h-[44px] ${
                isActive ? 'text-apricot' : 'text-text-secondary'
              }`
            }
          >
            <span className="text-xl leading-none">{tab.icon}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
