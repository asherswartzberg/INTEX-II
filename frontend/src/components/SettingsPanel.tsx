import { useEffect, useState, useCallback, useMemo } from 'react'
import type { FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  getTwoFactorStatus,
  enableTwoFactor,
  disableTwoFactor,
  resetRecoveryCodes,
  type TwoFactorStatus,
} from '../lib/authAPI'
import { apiRequest } from '../apis/client'
import ConfirmDialog from './ConfirmDialog'

interface ManagedUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
  accessibleSafehouseIds: number[]
}

interface SafehouseOption {
  safehouseId: number
  name: string | null
  safehouseCode: string | null
}

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { authSession } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isAdmin = authSession.roles.includes('Admin')

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [safehouses, setSafehouses] = useState<SafehouseOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingSafehouses, setLoadingSafehouses] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'Admin' | 'Staff'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formFirstName, setFormFirstName] = useState('')
  const [formLastName, setFormLastName] = useState('')
  const [formRole, setFormRole] = useState<'Admin' | 'Staff'>('Staff')
  const [formSafehouseIds, setFormSafehouseIds] = useState<number[]>([])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null)

  // ── 2FA state ──
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null)
  const [authenticatorCode, setAuthenticatorCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [mfaError, setMfaError] = useState('')
  const [mfaSuccess, setMfaSuccess] = useState('')
  const [mfaSubmitting, setMfaSubmitting] = useState(false)

  useEffect(() => {
    if (open) getTwoFactorStatus().then(setTwoFactorStatus).catch(() => {})
  }, [open])

  const authenticatorUri = useMemo(() => {
    if (!authSession.email || !twoFactorStatus?.sharedKey) return ''
    const issuer = 'Faro Safehouse'
    const label = `${issuer}:${authSession.email}`
    const params = new URLSearchParams({ secret: twoFactorStatus.sharedKey, issuer })
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`
  }, [authSession.email, twoFactorStatus?.sharedKey])

  async function handleEnableMfa(e: FormEvent) {
    e.preventDefault()
    setMfaError(''); setMfaSuccess(''); setMfaSubmitting(true)
    try {
      const status = await enableTwoFactor(authenticatorCode)
      setTwoFactorStatus(status)
      setRecoveryCodes(status.recoveryCodes ?? [])
      setAuthenticatorCode('')
      setMfaSuccess('MFA is now enabled. Save the recovery codes below.')
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Unable to enable MFA.')
    } finally { setMfaSubmitting(false) }
  }

  async function handleDisableMfa() {
    setMfaError(''); setMfaSuccess(''); setMfaSubmitting(true)
    try {
      const status = await disableTwoFactor()
      setTwoFactorStatus(status)
      setRecoveryCodes([])
      setMfaSuccess('MFA has been disabled.')
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Unable to disable MFA.')
    } finally { setMfaSubmitting(false) }
  }

  async function handleResetCodes() {
    setMfaError(''); setMfaSuccess(''); setMfaSubmitting(true)
    try {
      const status = await resetRecoveryCodes()
      setTwoFactorStatus(status)
      setRecoveryCodes(status.recoveryCodes ?? [])
      setMfaSuccess('Recovery codes were reset. Save the new codes.')
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : 'Unable to reset recovery codes.')
    } finally { setMfaSubmitting(false) }
  }

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const data = await apiRequest<ManagedUser[]>('/api/auth/users')
      setUsers(
        Array.isArray(data)
          ? data.map((u) => ({
              ...u,
              accessibleSafehouseIds: Array.isArray(u.accessibleSafehouseIds) ? u.accessibleSafehouseIds : [],
            }))
          : [],
      )
    } catch {
      // ignore
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const fetchSafehouses = useCallback(async () => {
    setLoadingSafehouses(true)
    try {
      setSafehouses(await apiRequest<SafehouseOption[]>('/api/safehouses'))
    } catch {
      // ignore
    } finally {
      setLoadingSafehouses(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchSafehouses()
    }
    if (isAdmin && open) {
      fetchUsers()
    }
  }, [isAdmin, open, fetchUsers, fetchSafehouses])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const resetForm = useCallback(() => {
    setEditingUser(null)
    setFormEmail('')
    setFormPassword('')
    setFormFirstName('')
    setFormLastName('')
    setFormRole('Staff')
    setFormSafehouseIds([])
    setFormError('')
  }, [])

  const openCreateForm = () => {
    resetForm()
    setShowForm(true)
  }

  const openEditForm = (user: ManagedUser) => {
    setEditingUser(user)
    setFormEmail(user.email)
    setFormPassword('')
    setFormFirstName(user.firstName ?? '')
    setFormLastName(user.lastName ?? '')
    setFormRole(user.roles.includes('Admin') ? 'Admin' : 'Staff')
    setFormSafehouseIds(Array.isArray(user.accessibleSafehouseIds) ? user.accessibleSafehouseIds : [])
    setFormError('')
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formEmail || !formFirstName || !formLastName) {
      setFormError('Email, first name, and last name are required.')
      return
    }

    if (!editingUser && !formPassword) {
      setFormError('Password is required for new users.')
      return
    }

    if (!editingUser && formPassword.length < 14) {
      setFormError('Password must be at least 14 characters.')
      return
    }

    setSaving(true)
    try {
      await apiRequest(
        editingUser ? `/api/auth/users/${editingUser.id}` : '/api/auth/users',
        {
          method: editingUser ? 'POST' : 'POST',
          body: {
            email: formEmail,
            password: formPassword || null,
            firstName: formFirstName,
            lastName: formLastName,
            role: formRole,
            accessibleSafehouseIds: formRole === 'Staff' ? formSafehouseIds : [],
          },
        },
      )

      setShowForm(false)
      resetForm()
      await fetchUsers()
    } catch {
      setFormError(`Failed to ${editingUser ? 'update' : 'create'} user.`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFacility = (safehouseId: number) => {
    setFormSafehouseIds((prev) =>
      prev.includes(safehouseId) ? prev.filter((id) => id !== safehouseId) : [...prev, safehouseId],
    )
  }

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await apiRequest(`/api/auth/users/${deleteTarget.id}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
    } catch {
      // ignore
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  const nonDonorUsers = users.filter((u) => !u.roles.includes('Donor'))
  const filteredUsers =
    activeTab === 'all' ? nonDonorUsers : nonDonorUsers.filter((u) => u.roles.includes(activeTab))

  const renderSafehouseLabel = (safehouse: SafehouseOption) =>
    (safehouse.name ?? `SH-${safehouse.safehouseId}`).replace(/Lighthouse/gi, 'Faro')

  const renderFacilityNames = (safehouseIds: number[]) => {
    if (safehouseIds.length === 0) return 'No facility access assigned'

    const labels = safehouseIds
      .map((id) => safehouses.find((safehouse) => safehouse.safehouseId === id))
      .filter((safehouse): safehouse is SafehouseOption => Boolean(safehouse))
      .map(renderSafehouseLabel)

    return labels.length > 0 ? labels.join(', ') : `${safehouseIds.length} assigned facility${safehouseIds.length === 1 ? '' : 'ies'}`
  }

  const renderFacilityIds = (safehouseIds: number[]) => Array.from(new Set(safehouseIds)).sort((a, b) => a - b)
  const currentUserFacilityIds = renderFacilityIds(authSession.accessibleSafehouseIds ?? [])

  return (
    <AnimatePresence>
      {open ? [
        <motion.div
          key="settings-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />,
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
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4 dark:border-[#333]">
            <div>
              <h2 className="text-lg font-bold text-black dark:text-white">Settings</h2>
              <p className="mt-0.5 text-xs text-medium-gray">Manage your preferences and account info.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-off-white text-medium-gray transition-colors hover:bg-gray-100 hover:text-black dark:bg-[#222] dark:border-[#444] dark:text-gray-400 dark:hover:bg-[#2a2a2a] dark:hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-10 px-6 py-8">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">Profile</h3>
              <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-white dark:bg-[#222] dark:border-[#333]">
                <Row label="Email" value={authSession.email ?? '—'} />
                <Row label="Name" value={[authSession.firstName, authSession.lastName].filter(Boolean).join(' ') || '—'} />
                <Row label="Role" value={authSession.roles.join(', ') || '—'} />
              </div>
            </section>

              {/* Two-Factor Authentication */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">Two-Factor Authentication</h3>

                {mfaError && (
                  <div className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{mfaError}</div>
                )}
                {mfaSuccess && (
                  <div className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">{mfaSuccess}</div>
                )}

                {twoFactorStatus === null ? (
                  <p className="mt-4 text-sm text-medium-gray">Loading MFA status...</p>
                ) : twoFactorStatus.isTwoFactorEnabled ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-border bg-white px-5 py-4 dark:bg-[#222] dark:border-[#333]">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        </span>
                        <div>
                          <p className="text-sm font-medium text-black dark:text-white">MFA is enabled</p>
                          <p className="text-xs text-medium-gray">Recovery codes remaining: {twoFactorStatus.recoveryCodesLeft}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={handleResetCodes} disabled={mfaSubmitting}
                        className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-black transition-colors hover:bg-off-white disabled:opacity-60 dark:text-white dark:border-[#333] dark:hover:bg-[#2a2a2a]">
                        Reset Codes
                      </button>
                      <button type="button" onClick={handleDisableMfa} disabled={mfaSubmitting}
                        className="flex-1 rounded-lg border border-red-200 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60">
                        Disable MFA
                      </button>
                    </div>
                    {recoveryCodes.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-xs font-medium text-amber-800">Save these recovery codes now</p>
                        <ul className="mt-2 grid grid-cols-2 gap-1">
                          {recoveryCodes.map((code) => (
                            <li key={code} className="font-mono text-xs text-amber-900">{code}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-border bg-white p-4 dark:bg-[#222] dark:border-[#333]">
                    <div className="flex justify-center mb-4">
                      {authenticatorUri ? (
                        <div className="rounded-lg border border-border bg-white p-2">
                          <QRCodeSVG value={authenticatorUri} size={160} />
                        </div>
                      ) : (
                        <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-border bg-off-white text-xs text-medium-gray">No QR code</div>
                      )}
                    </div>
                    <ol className="space-y-1 text-xs text-medium-gray list-decimal list-inside mb-3">
                      <li>Install an authenticator app (Google Authenticator, Authy)</li>
                      <li>Scan the QR code above</li>
                      <li>Enter the 6-digit code below to confirm</li>
                    </ol>
                    {twoFactorStatus.sharedKey && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-medium-gray">Shared key</p>
                        <code className="mt-1 block break-all rounded bg-off-white px-2 py-1.5 text-[11px] text-black dark:bg-[#111] dark:text-white">{twoFactorStatus.sharedKey}</code>
                      </div>
                    )}
                    <form onSubmit={handleEnableMfa} className="flex gap-2">
                      <input
                        type="text" inputMode="numeric" autoComplete="one-time-code"
                        value={authenticatorCode} onChange={(e) => setAuthenticatorCode(e.target.value)}
                        placeholder="6-digit code"
                        className="flex-1 rounded-lg border border-border bg-off-white px-3 py-2 text-sm text-black placeholder-medium-gray/50 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:bg-[#111] dark:border-[#333] dark:text-white"
                      />
                      <button type="submit" disabled={mfaSubmitting || !authenticatorCode}
                        className="rounded-lg !bg-[#333] px-4 py-2 text-xs font-semibold !text-white disabled:opacity-60 transition-all hover:!bg-[#555]">
                        {mfaSubmitting ? 'Verifying...' : 'Enable'}
                      </button>
                    </form>
                  </div>
                )}
              </section>
            {authSession.roles.includes('Staff') && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">Assigned Facilities</h3>
                <div className="mt-4 rounded-2xl border border-border bg-gradient-to-br from-white to-off-white px-5 py-4 shadow-sm dark:border-[#333] dark:from-[#222] dark:to-[#1b1b1b]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-medium-gray">Safehouses</p>
                  </div>
                  {loadingSafehouses ? (
                    <p className="mt-3 text-sm text-medium-gray">Loading facilities...</p>
                  ) : currentUserFacilityIds.length === 0 ? (
                    <p className="mt-3 text-sm text-medium-gray">No facility access assigned</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {currentUserFacilityIds.map((id) => (
                        <span
                          key={id}
                          className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-border bg-white px-2.5 text-sm font-semibold text-black shadow-sm dark:border-[#444] dark:bg-[#111] dark:text-white"
                          title={`Safehouse ${id}`}
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

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

            {isAdmin && (
              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">User Management</h3>
                  <button
                    onClick={() => (showForm ? (setShowForm(false), resetForm()) : openCreateForm())}
                    className="rounded-lg border border-black/10 bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-black/85 hover:shadow-md active:scale-95 dark:border-white/15 dark:!bg-gray-200 dark:!text-black dark:hover:!bg-gray-300"
                  >
                    {showForm ? 'Cancel' : '+ Create User'}
                  </button>
                </div>

                {showForm && (
                  <form onSubmit={handleSave} className="mt-4 rounded-xl border border-border bg-white p-5 dark:bg-[#222] dark:border-[#333]">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-black dark:text-white">
                        {editingUser ? 'Edit user' : 'Create user'}
                      </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setShowForm(false)
                            resetForm()
                          }}
                          className="rounded-md px-2 py-1 text-xs font-medium text-medium-gray transition-colors hover:bg-off-white hover:text-black dark:hover:bg-[#2a2a2a] dark:hover:text-white"
                        >
                          Close
                        </button>
                      </div>

                    {formError && (
                      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {formError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        placeholder="First name"
                        value={formFirstName}
                        onChange={(e) => setFormFirstName(e.target.value)}
                        className="rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm dark:bg-[#111] dark:border-[#333] dark:text-white"
                      />
                      <input
                        placeholder="Last name"
                        value={formLastName}
                        onChange={(e) => setFormLastName(e.target.value)}
                        className="rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm dark:bg-[#111] dark:border-[#333] dark:text-white"
                      />
                    </div>

                    <input
                      type="email"
                      placeholder="Email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm dark:bg-[#111] dark:border-[#333] dark:text-white"
                    />

                    <input
                      type="password"
                      placeholder={editingUser ? 'New password (optional)' : 'Password (min 14 characters)'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm dark:bg-[#111] dark:border-[#333] dark:text-white"
                    />

                      <div className="mt-3 flex gap-2">
                        {(['Admin', 'Staff'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setFormRole(r)}
                            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                              formRole === r
                                ? 'border-black bg-black text-white shadow-sm dark:border-gray-200 dark:!bg-gray-200 dark:!text-black dark:hover:!bg-gray-300'
                                : 'border-border bg-white text-medium-gray hover:border-gray-400 hover:bg-off-white dark:border-[#555] dark:bg-[#333] dark:text-gray-200 dark:hover:border-[#777] dark:hover:bg-[#3a3a3a] dark:hover:text-white'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                    </div>

                    {formRole === 'Staff' && (
                      <div className="mt-4 rounded-lg border border-border bg-off-white p-3 dark:bg-[#111] dark:border-[#333]">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-medium-gray">
                          Facility access
                        </div>
                        <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                          {loadingSafehouses ? (
                            <p className="text-xs text-medium-gray">Loading facilities...</p>
                          ) : safehouses.length === 0 ? (
                            <p className="text-xs text-medium-gray">No facilities available.</p>
                          ) : (
                            safehouses.map((safehouse) => (
                              <label
                                key={`safehouse-${safehouse.safehouseId}`}
                                className="flex cursor-pointer items-center gap-2 text-sm text-black dark:text-white"
                              >
                                <input
                                  type="checkbox"
                                  checked={formSafehouseIds.includes(safehouse.safehouseId)}
                                  onChange={() => handleToggleFacility(safehouse.safehouseId)}
                                  className="h-4 w-4 rounded border-border"
                                />
                                <span>{renderSafehouseLabel(safehouse)}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={saving}
                      className="mt-4 w-full rounded-lg border border-black/10 bg-black py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-black/85 hover:shadow-md active:scale-[0.99] disabled:opacity-60 dark:border-white/15 dark:!bg-gray-200 dark:!text-black dark:hover:!bg-gray-300"
                    >
                      {saving ? (editingUser ? 'Saving...' : 'Creating...') : editingUser ? 'Save Changes' : 'Create User'}
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
                      {tab === 'all'
                        ? `All (${nonDonorUsers.length})`
                        : `${tab} (${nonDonorUsers.filter((u) => u.roles.includes(tab)).length})`}
                    </button>
                  ))}
                </div>

                <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-white dark:bg-[#222] dark:border-[#333]">
                  {loadingUsers ? (
                    <p className="px-5 py-8 text-center text-sm text-medium-gray">Loading users...</p>
                  ) : filteredUsers.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-medium-gray">No users found.</p>
                  ) : (
                    filteredUsers.map((u, index) => (
                      <div key={`user-${index}-${u.id || u.email || 'unknown'}`} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-sm font-medium text-black dark:text-white">
                            {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                          </p>
                          <p className="text-xs text-medium-gray">{u.email}</p>
                          {u.roles.includes('Staff') && (
                            <p className="mt-1 text-[10px] text-medium-gray">
                              {renderFacilityNames(u.accessibleSafehouseIds ?? [])}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              u.roles.includes('Admin')
                                ? 'bg-black text-white dark:bg-white dark:text-black'
                                : u.roles.includes('Staff')
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {u.roles[0] ?? 'None'}
                          </span>
                          {u.email !== authSession.email && (
                            <button
                              onClick={() => openEditForm(u)}
                              className="text-xs text-medium-gray transition-colors hover:text-black dark:hover:text-white"
                              aria-label={`Edit ${u.email}`}
                            >
                              Edit
                            </button>
                          )}
                          {u.email !== authSession.email && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="text-xs text-red-500 transition-colors hover:text-red-700"
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
        </motion.aside>,
      ] : null}

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
