import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Map, Navigation, Package,
  Calendar, Calculator, ShieldCheck, Flame, LogOut, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reps', icon: Users, label: 'Sales Reps' },
  { to: '/map', icon: Map, label: 'Dispensary Map' },
  { to: '/routing', icon: Navigation, label: 'Routing' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/timeline', icon: Calendar, label: '90-Day Timeline' },
  { to: '/calculator', icon: Calculator, label: 'Cost Calculator' },
  { to: '/compliance', icon: ShieldCheck, label: 'Compliance' },
  { to: '/leads', icon: Flame, label: 'Lead Pipeline' },
]

export function Sidebar() {
  const { signOut, user } = useAuth()
  const [open, setOpen] = useState(false)

  const inner = (
    <div className="flex flex-col h-full py-6">
      <div className="px-5 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/30 border border-indigo-500/40 flex items-center justify-center">
            <span className="text-indigo-400 font-bold text-xs">LE</span>
          </div>
          <span className="text-sm font-semibold text-white/90 tracking-tight">Lifted Extracts</span>
        </div>
        <p className="text-[10px] text-white/30 mt-1 ml-9">Sales CRM</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pt-4 border-t border-white/[0.06]">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-white/40 truncate">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 w-full"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 border-r border-white/[0.06] bg-white/[0.02]">
        {inner}
      </aside>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white/70"
      >
        <Menu size={18} />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative w-56 h-full bg-[#080b12]/95 border-r border-white/[0.08]">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white/70"
            >
              <X size={16} />
            </button>
            {inner}
          </aside>
        </div>
      )}
    </>
  )
}
