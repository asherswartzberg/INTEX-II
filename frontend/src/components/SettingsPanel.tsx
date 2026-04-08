import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getApiBaseUrl } from '../apis/client'
import ConfirmDialog from './ConfirmDialog'

interface ManagedUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { authSession } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isAdmin = authSession.roles.includes('Admin')

  // User management state (admin only)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'Admin' | 'Staff'>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createFirstName, setCreateFirstName] = useState('')
  const [createLastName, setCreateLastName] = useState('')
  const [createRole, setCreateRole] = useState('Staff')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/users`, { credentials: 'include' })
      if (res.ok) setUsers(await res.json())
    } catch { /* ignore */ }
    finally { setLoadingUsers(false) }
  }, [])

  useEffect(() => {
    if (isAdmin && open) fetchUsers()
  }, [isAdmin, open, fetchUsers])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (!createEmail || !createPassword || !createFirstName || !createLastName) {
      setCreateError('All fields are required.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
          firstName: createFirstName,
          lastName: createLastName,
          role: createRole,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setCreateError(data?.message || 'Failed to create user.')
        return
      }
      setShowCreateForm(false)
      setCreateEmail('')
      setCreatePassword('')
      setCreateFirstName('')
      setCreateLastName('')
      setCreateRole('Staff')
      fetchUsers()
    } catch {
      setCreateError('Failed to create user.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await fetch(`${getApiBaseUrl()}/api/auth/users/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
    } catch { /* ignore */ }
    finally { setDeleteTarget(null) }
  }, [deleteTarget])

  const nonDonorUsers = users.filter((u) => !u.roles.includes('Donor'))
  const filteredUsers = activeTab === 'all' ? nonDonorUsers : nonDonorUsers.filter((u) => u.roles.includes(activeTab))

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            key="settings-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-white shadow-2xl dark:bg-[#1a1a1a] dark:border-[#333]"
            aria-label="Settings"
            role="dialog"
            aria-modal="true"
          >
            {/* Panel header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4 dark:border-[#333]">
              <div>
                <h2 className="text-lg font-bold text-black dark:text-white">Settings</h2>
                <p className="mt-0.5 text-xs text-medium-gray">Manage your preferences and account info.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="flex items-center justify-center w-9 h-9 rounded-full border border-border bg-off-white text-medium-gray transition-colors hover:bg-gray-100 hover:text-black dark:bg-[#222] dark:border-[#444] dark:text-gray-400 dark:hover:bg-[#2a2a2a] dark:hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 px-6 py-8 space-y-10">
              {/* Profile info */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">Profile</h3>
                <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-white dark:bg-[#222] dark:border-[#333]">
                  <Row label="Email" value={authSession.email ?? '—'} />
                  <Row label="Name" value={[authSession.firstName, authSession.lastName].filter(Boolean).join(' ') || '—'} />
                  <Row label="Role" value={authSession.roles.join(', ') || '—'} />
                </div>
              </section>

              {/* Appearance */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">Appearance</h3>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-white px-5 py-4 dark:bg-[#222] dark:border-[#333]">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">Dark mode</p>
                    <p className="mt-0.5 text-xs text-medium-gray">Preference is saved in a browser cookie.</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={theme === 'dark'}
                    aria-label="Toggle dark mode"
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                      theme === 'dark' ? '!bg-white' : '!bg-border'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full shadow-sm transition-transform duration-200 ${
                        theme === 'dark' ? 'translate-x-6 !bg-black' : 'translate-x-1 !bg-white'
                      }`}
                    />
                  </button>
                </div>
              </section>

              {/* User Management — Admin only */}
              {isAdmin && (
                <section>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">User Management</h3>
                    <button
                      onClick={() => setShowCreateForm(!showCreateForm)}
                      className="rounded-lg !bg-[#333] px-4 py-2 text-xs font-semibold !text-white transition-all hover:!bg-[#555] hover:scale-105 active:scale-95"
                    >
                      {showCreateForm ? 'Cancel' : '+ Create User'}
                    </button>
                  </div>

                  {showCreateForm && (
                    <form onSubmit={handleCreate} className="mt-4 rounded-xl border border-border bg-white p-5 dark:bg-[#222] dark:border-[#333]">
                      {createError && (
                        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">{createError}</div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          placeholder="First name"
                          value={createFirstName}
                          onChange={(e) => setCreateFirstName(e.target.value)}
                          className="rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm dark:bg-[#111] dark:border-[#333] dark:text-white"
                        />
                        <input
                          placeholder="Last name"
                          value={createLastName}
                          onChange={(e) => setCreateLastName(e.target.value)}
                          className="rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm dark:bg-[#111] dark:border-[#333] dark:text-white"
                        />
                      </div>
                      <input
                        type="email"
                        placeholder="Email"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        className="mt-3 w-full rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm dark:bg-[#111] dark:border-[#333] dark:text-white"
                      />
                      <input
                        type="password"
                        placeholder="Password (min 14 characters)"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        className="mt-3 w-full rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm dark:bg-[#111] dark:border-[#333] dark:text-white"
                      />
                      <div className="mt-3 flex gap-2">
                        {(['Admin', 'Staff'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setCreateRole(r)}
                            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                              createRole === r
                                ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                                : 'border-border text-medium-gray hover:border-gray-400 dark:border-[#333]'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <button
                        type="submit"
                        disabled={creating}
                        className="mt-4 w-full rounded-lg !bg-[#333] py-2.5 text-sm font-semibold !text-white disabled:opacity-60 transition-all hover:!bg-[#555] hover:scale-[1.01] active:scale-[0.99]"
                      >
                        {creating ? 'Creating...' : 'Create User'}
                      </button>
                    </form>
                  )}

                  <div className="mt-4 flex gap-1 rounded-lg bg-off-white p-1 dark:bg-[#222]">
                    {(['all', 'Admin', 'Staff'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          activeTab === tab
                            ? 'bg-white text-black shadow-sm dark:bg-[#333] dark:text-white'
                            : 'text-medium-gray hover:text-black dark:hover:text-white'
                        }`}
                      >
                        {tab === 'all' ? `All (${nonDonorUsers.length})` : `${tab} (${nonDonorUsers.filter(u => u.roles.includes(tab)).length})`}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-white dark:bg-[#222] dark:border-[#333]">
                    {loadingUsers ? (
                      <p className="px-5 py-8 text-center text-sm text-medium-gray">Loading users...</p>
                    ) : filteredUsers.length === 0 ? (
                      <p className="px-5 py-8 text-center text-sm text-medium-gray">No users found.</p>
                    ) : (
                      filteredUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-black dark:text-white">
                              {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                            </p>
                            <p className="text-xs text-medium-gray">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              u.roles.includes('Admin')
                                ? 'bg-black text-white dark:bg-white dark:text-black'
                                : u.roles.includes('Staff')
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {u.roles[0] ?? 'None'}
                            </span>
                            {u.email !== authSession.email && (
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                aria-label={`Delete ${u.email}`}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}
            </div>
          </motion.aside>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete user"
        message={`Are you sure you want to delete ${deleteTarget?.email}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AnimatePresence>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm text-medium-gray">{label}</span>
      <span className="text-sm font-medium text-black dark:text-white">{value}</span>
    </div>
  )
}
