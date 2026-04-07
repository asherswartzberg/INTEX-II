import { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import ConfirmDialog from './ConfirmDialog'

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
    label: 'Reports',
    to: '/admin/reports',
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
  return (
    <div data-admin className="flex flex-col h-screen bg-[#F7F8FA] dark:bg-[#111] font-sans overflow-hidden">

      {/* ── Top bar ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-3 dark:bg-[#1a1a1a] dark:border-[#333]">
        {/* Branding */}
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/Lighthouse.svg" alt="Faro Safehouse" className="h-8 w-8 object-contain" />
          <span
            className="text-2xl font-normal text-gray-900 dark:text-white"
            style={{ fontFamily: "'EB Garamond', serif" }}
          >
            Faro Safehouse
          </span>
        </Link>

        {/* Right-side nav */}
        <div className="flex items-center gap-6">
          <span className="text-[13px] text-gray-400 dark:text-gray-500">
            {authSession.roles.includes('Admin') ? 'Admin' : 'Staff'} · {authSession.firstName || 'User'}
          </span>
          <Link
            to="/"
            className="text-[13px] font-medium text-gray-600 transition-opacity hover:opacity-60 dark:text-gray-400"
          >
            Back to site
          </Link>
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `text-[13px] font-medium transition-opacity hover:opacity-60 ${
                isActive
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`
            }
          >
            Settings
          </NavLink>
          <button
            onClick={() => setShowSignOut(true)}
            className="rounded-full bg-black px-4 py-1.5 text-[13px] font-semibold text-white transition-colors btn-wipe dark:bg-white dark:text-black"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-[200px] shrink-0 flex-col border-r border-gray-100 bg-white dark:bg-[#1a1a1a] dark:border-[#333]">
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-0.5">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 dark:bg-[#2a2a2a] dark:text-white'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-[#222] dark:hover:text-white'
                      }`
                    }
                  >
                    <span className="shrink-0 opacity-60">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge != null && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-[#333] dark:text-gray-300">
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
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        onConfirm={() => navigate('/logout')}
        onCancel={() => setShowSignOut(false)}
      />
    </div>
  )
}
