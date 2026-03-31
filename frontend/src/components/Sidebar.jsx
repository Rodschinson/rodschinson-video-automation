import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PlusSquare, Library, CalendarDays, BarChart3, ExternalLink } from 'lucide-react'

const NAV = [
  { to: '/',          icon: PlusSquare,   label: 'New Content' },
  { to: '/library',   icon: Library,      label: 'Library'     },
  { to: '/schedule',  icon: CalendarDays, label: 'Schedule'    },
  { to: '/analytics', icon: BarChart3,    label: 'Analytics'   },
]

function MetricoolLink() {
  const [hover, setHover] = useState(false)
  return (
    <a
      href="https://app.metricool.com"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 20px',
        textDecoration: 'none',
        color: hover ? '#00B6FF' : 'var(--cs-text-sub)',
        fontWeight: 400,
        fontSize: 14,
        borderLeft: '2px solid transparent',
        background: hover ? 'rgba(0,182,255,0.06)' : 'transparent',
        transition: 'color 0.15s, background 0.15s',
      }}
    >
      {/* Metricool "M" mark */}
      <span style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
        background: hover ? '#00B6FF' : 'var(--cs-text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 10, fontWeight: 800, lineHeight: 1,
        transition: 'background 0.15s',
      }}>M</span>
      Metricool
      <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
    </a>
  )
}

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

      {/* Divider */}
      <div style={{ margin: '10px 20px', borderTop: '1px solid var(--cs-border)' }} />

      <MetricoolLink />
    </aside>
  )
}
