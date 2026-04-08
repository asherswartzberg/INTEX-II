import { useEffect, useState, useCallback, useMemo } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import QRCode from 'qrcode'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getApiBaseUrl } from '../apis/client'
import {
  getTwoFactorStatus,
  enableTwoFactor,
  disableTwoFactor,
  resetRecoveryCodes,
  type TwoFactorStatus,
} from '../lib/authAPI'
import ConfirmDialog from '../components/ConfirmDialog'

interface ManagedUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  roles: string[]
}

export default function SettingsPage() {
  const { authSession } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
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
    if (isAdmin) fetchUsers()
  }, [isAdmin, fetchUsers])

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

  const isDonor = authSession.roles.includes('Donor')
  const [supporterType, setSupporterType] = useState<string | null>(null)
  const [supporterStatus, setSupporterStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!isDonor) return
    fetch(`${getApiBaseUrl()}/api/auth/my-profile`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.supporter) {
          setSupporterType(d.supporter.supporterType)
          setSupporterStatus(d.supporter.status)
        }
      })
      .catch(() => {})
  }, [isDonor])

  // ── 2FA state ──────────────────────────────────────────
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null)
  const [authenticatorCode, setAuthenticatorCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [mfaError, setMfaError] = useState('')
  const [mfaSuccess, setMfaSuccess] = useState('')
  const [mfaSubmitting, setMfaSubmitting] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')

  useEffect(() => {
    getTwoFactorStatus().then(setTwoFactorStatus).catch(() => {})
  }, [])

  const authenticatorUri = useMemo(() => {
    if (!authSession.email || !twoFactorStatus?.sharedKey) return ''
    const issuer = 'Faro Safehouse'
    const label = `${issuer}:${authSession.email}`
    const params = new URLSearchParams({ secret: twoFactorStatus.sharedKey, issuer })
    return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`
  }, [authSession.email, twoFactorStatus?.sharedKey])

  useEffect(() => {
    if (!authenticatorUri) { setQrCodeDataUrl(''); return }
    QRCode.toDataURL(authenticatorUri, { width: 224, margin: 1 })
      .then(setQrCodeDataUrl)
      .catch(() => setQrCodeDataUrl(''))
  }, [authenticatorUri])

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

  const SUPPORTER_TYPE_LABELS: Record<string, string> = {
    MonetaryDonor: 'Monetary Donor', InKindDonor: 'In-Kind Donor', Volunteer: 'Volunteer',
    SkillsContributor: 'Skills Contributor', SocialMediaAdvocate: 'Social Media Advocate', PartnerOrganization: 'Partner Organization',
  }

  const backTo = isDonor ? '/donor' : '/admin/dashboard'

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-medium-gray">Manage your preferences and account info.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(backTo)}
          aria-label="Back to dashboard"
          className="flex items-center justify-center w-9 h-9 rounded-full border border-border bg-white text-medium-gray transition-colors hover:bg-off-white hover:text-black dark:bg-[#1a1a1a] dark:border-[#333] dark:text-gray-400 dark:hover:bg-[#2a2a2a] dark:hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Profile info */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">Profile</h2>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-white dark:bg-[#1a1a1a] dark:border-[#333]">
          <Row label="Email" value={authSession.email ?? '—'} />
          <Row label="Name" value={[authSession.firstName, authSession.lastName].filter(Boolean).join(' ') || '—'} />
          <Row label="Role" value={authSession.roles.join(', ') || '—'} />
          {isDonor && supporterType && (
            <Row label="Donor type" value={SUPPORTER_TYPE_LABELS[supporterType] ?? supporterType} />
          )}
          {isDonor && supporterStatus && (
            <Row label="Status" value={supporterStatus} />
          )}
        </div>
      </section>

      {/* Appearance */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">Appearance</h2>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-white px-5 py-4 dark:bg-[#1a1a1a] dark:border-[#333]">
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

      {/* Two-Factor Authentication */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">Two-Factor Authentication</h2>

        {mfaError && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">{mfaError}</div>
        )}
        {mfaSuccess && (
          <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-200">{mfaSuccess}</div>
        )}

        {twoFactorStatus === null ? (
          <p className="mt-4 text-sm text-medium-gray">Loading MFA status...</p>
        ) : twoFactorStatus.isTwoFactorEnabled ? (
          /* ── 2FA is enabled ── */
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-white px-5 py-4 dark:bg-[#1a1a1a] dark:border-[#333]">
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleResetCodes}
                disabled={mfaSubmitting}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-black transition-colors hover:bg-off-white disabled:opacity-60 dark:text-white dark:border-[#333] dark:hover:bg-[#2a2a2a]"
              >
                Reset Recovery Codes
              </button>
              <button
                type="button"
                onClick={handleDisableMfa}
                disabled={mfaSubmitting}
                className="flex-1 rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                Disable MFA
              </button>
            </div>

            {recoveryCodes.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-sm font-medium text-amber-800">Save these recovery codes now</p>
                <p className="mt-1 text-xs text-amber-700">They are only shown when newly generated.</p>
                <ul className="mt-3 grid grid-cols-2 gap-1">
                  {recoveryCodes.map((code) => (
                    <li key={code} className="font-mono text-sm text-amber-900">{code}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* ── 2FA is not enabled — show setup ── */
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border bg-white p-5 dark:bg-[#1a1a1a] dark:border-[#333]">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                {/* QR code */}
                <div className="shrink-0">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="Authenticator QR code" className="h-56 w-56 rounded-lg border border-border bg-white p-2" />
                  ) : (
                    <div className="flex h-56 w-56 items-center justify-center rounded-lg border border-border bg-off-white text-sm text-medium-gray">No QR code</div>
                  )}
                </div>

                {/* Setup instructions */}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-black dark:text-white">Set up authenticator app</h3>
                  <ol className="mt-2 space-y-1 text-xs text-medium-gray list-decimal list-inside">
                    <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
                    <li>Scan the QR code or enter the shared key manually</li>
                    <li>Enter the 6-digit code from the app below to confirm</li>
                  </ol>

                  {twoFactorStatus.sharedKey && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-medium-gray">Shared key</p>
                      <code className="mt-1 block break-all rounded bg-off-white px-3 py-2 text-xs text-black dark:bg-[#111] dark:text-white">{twoFactorStatus.sharedKey}</code>
                    </div>
                  )}

                  <form onSubmit={handleEnableMfa} className="mt-4">
                    <label htmlFor="mfaCode" className="mb-1.5 block text-xs font-medium text-black dark:text-white">
                      Verification code
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="mfaCode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={authenticatorCode}
                        onChange={(e) => setAuthenticatorCode(e.target.value)}
                        placeholder="6-digit code"
                        className="flex-1 rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm text-black placeholder-medium-gray/50 focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:bg-[#111] dark:border-[#333] dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={mfaSubmitting || !authenticatorCode}
                        className="rounded-lg !bg-[#333] px-5 py-2.5 text-sm font-semibold !text-white disabled:opacity-60 transition-all hover:!bg-[#555]"
                      >
                        {mfaSubmitting ? 'Verifying...' : 'Enable MFA'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* User Management — Admin only */}
      {isAdmin && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">User Management</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="rounded-lg !bg-[#333] px-4 py-2 text-xs font-semibold !text-white transition-all hover:!bg-[#555] hover:scale-105 active:scale-95"
            >
              {showCreateForm ? 'Cancel' : '+ Create User'}
            </button>
          </div>

          {/* Create user form */}
          {showCreateForm && (
            <form onSubmit={handleCreate} className="mt-4 rounded-xl border border-border bg-white p-5 dark:bg-[#1a1a1a] dark:border-[#333]">
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

          {/* User list tabs */}
          <div className="mt-4 flex gap-1 rounded-lg bg-off-white p-1 dark:bg-[#1a1a1a]">
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

          {/* User list */}
          <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-white dark:bg-[#1a1a1a] dark:border-[#333]">
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete user"
        message={`Are you sure you want to delete ${deleteTarget?.email}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
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
