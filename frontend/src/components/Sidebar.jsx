import { NavLink } from 'react-router-dom'
import { PlusSquare, Library, CalendarDays, BarChart3 } from 'lucide-react'

const NAV = [
  { to: '/',          icon: PlusSquare,   label: 'New Content' },
  { to: '/library',   icon: Library,      label: 'Library'     },
  { to: '/schedule',  icon: CalendarDays, label: 'Schedule'    },
  { to: '/analytics', icon: BarChart3,    label: 'Analytics'   },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      background: 'var(--cs-surface)',
      borderRight: '1px solid var(--cs-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      gap: 2,
      transition: 'background 0.2s',
    }}>
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 20px',
            textDecoration: 'none',
            color: isActive ? '#00B6FF' : 'var(--cs-text-sub)',
            fontWeight: isActive ? 600 : 400,
            fontSize: 14,
            borderLeft: isActive ? '2px solid #00B6FF' : '2px solid transparent',
            background: isActive ? 'rgba(0,182,255,0.06)' : 'transparent',
            transition: 'color 0.15s, background 0.15s',
          })}
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
