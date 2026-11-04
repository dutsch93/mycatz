import { NavLink } from 'react-router-dom'
import { Home, BarChart3, User, Settings, Plus, type LucideIcon } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'

const tabs = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/stats', label: 'Stats', Icon: BarChart3, end: false },
]

const tabsRight = [
  { to: '/profile', label: 'Profil', Icon: User, end: false },
  // Kurzes Label, damit es auch auf schmalen iPhones (320 pt) unter das Icon passt
  { to: '/settings', label: 'Optionen', Icon: Settings, end: false },
]

// Ein Tab mit Icon und sichtbarem Label (HIG: Tab-Labels helfen bei der Orientierung).
// Der aktive Tab ist nicht nur farbig, sondern bekommt zusätzlich eine Pille hinter dem
// Icon und ein kräftigeres Label — so ist er auch ohne Farbwahrnehmung erkennbar.
function TabLink({
  to,
  end,
  label,
  Icon,
}: {
  to: string
  end: boolean
  label: string
  Icon: LucideIcon
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 py-1.5 min-w-[56px] min-h-[44px] ${
          isActive ? 'text-apricot-strong' : 'text-text-secondary'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex items-center justify-center w-12 h-7 rounded-full ${
              isActive ? 'bg-apricot-strong/15' : ''
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
          </span>
          <span className={`text-[11px] leading-none ${isActive ? 'font-medium' : ''}`}>
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function BottomNav() {
  const { openQuickAdd } = useAppData()

  return (
    // Abstand zum Home-Indikator: env(safe-area-inset-bottom) ist auf iPhones ohne
    // Home-Button ca. 34 pt, sonst 0 (viewport-fit=cover ist in index.html gesetzt).
    <nav
      className="glass fixed left-3 right-3 max-w-app mx-auto rounded-[24px] z-40"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="flex items-center justify-around">
        {tabs.map(({ to, label, Icon, end }) => (
          <TabLink key={to} to={to} end={end} label={label} Icon={Icon} />
        ))}

        <button
          type="button"
          onClick={openQuickAdd}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-apricot-strong text-text-on-color -translate-y-2"
          aria-label="Neuer Eintrag"
        >
          <Plus size={26} strokeWidth={2} />
        </button>

        {tabsRight.map(({ to, label, Icon, end }) => (
          <TabLink key={to} to={to} end={end} label={label} Icon={Icon} />
        ))}
      </div>
    </nav>
  )
}
