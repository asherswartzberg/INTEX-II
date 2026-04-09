import { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import ConfirmDialog from './ConfirmDialog'
import SettingsPanel from './SettingsPanel'

type NavItem = { label: string; to: string; badge?: number; icon: React.ReactNode }

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/admin/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'Caseload',
    to: '/admin/caseload',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: 'Counseling',
    to: '/admin/counseling',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    label: 'Visitations',
    to: '/admin/visitations',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'Donors',
    to: '/admin/donors',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
  {
    label: 'Social Media',
    to: '/admin/social-media',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    to: '/admin/analytics',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
]

export default function AdminLayout() {
  const { authSession } = useAuth()
  const navigate = useNavigate()
  const [showSignOut, setShowSignOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  return (
    <div data-admin className="flex flex-col h-screen bg-off-white dark:bg-[#111] font-sans overflow-hidden">

      {/* ── Top bar ── */}
      <header className="grid shrink-0 grid-cols-3 items-center border-b border-border bg-white px-4 py-3 md:px-6 md:py-4 dark:bg-[#1a1a1a] dark:border-[#333]">

        {/* Left: hamburger + portal name + user */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100 md:hidden dark:hover:bg-[#222]"
            aria-label="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="whitespace-nowrap text-sm italic text-medium-gray dark:text-gray-500">
            {authSession.roles.includes('Admin') ? 'Admin' : 'Staff'} Portal
          </span>
          <span className="hidden text-medium-gray md:inline dark:text-gray-600">|</span>
          <span className="hidden text-sm font-semibold text-black md:inline dark:text-white">
            {authSession.firstName || 'User'}
          </span>
        </div>

        {/* Center: logo + wordmark */}
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-2">
            <img src="/Lighthouse.svg" alt="Faro Safehouse" className="h-6 w-6 md:h-7 md:w-7 object-contain" />
            <span
              className="hidden text-xl font-normal text-black sm:inline dark:text-white"
              style={{ fontFamily: "'EB Garamond', serif" }}
            >
              Faro Safehouse
            </span>
          </Link>
        </div>

        {/* Right: nav actions */}
        <div className="flex items-center justify-end gap-5 md:gap-6">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-medium-gray transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="hidden sm:inline">Home</span>
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-medium-gray transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={() => setShowSignOut(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-medium-gray transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {/* Sidebar overlay on mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[240px] shrink-0 flex-col border-r border-border bg-white transition-transform duration-200 md:static md:z-auto md:w-[200px] md:translate-x-0 dark:bg-[#1a1a1a] dark:border-[#333] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-0.5">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-off-white text-black dark:bg-[#2a2a2a] dark:text-white'
                          : 'text-medium-gray hover:bg-off-white hover:text-black dark:text-gray-400 dark:hover:bg-[#222] dark:hover:text-white'
                      }`
                    }
                  >
                    <span className="shrink-0 opacity-60">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge != null && (
                      <span className="rounded-full bg-off-white px-2 py-0.5 text-xs font-semibold text-dark-gray dark:bg-[#333] dark:text-gray-300">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto dark:bg-[#111] dark:text-[#e5e5e5]">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={showSignOut}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        onConfirm={() => navigate('/logout')}
        onCancel={() => setShowSignOut(false)}
      />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
