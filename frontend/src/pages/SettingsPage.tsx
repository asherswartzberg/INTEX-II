import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function SettingsPage() {
  const { authSession } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-black dark:text-white">Settings</h1>
      <p className="mt-1 text-sm text-medium-gray">Manage your preferences and account info.</p>

      {/* Profile info */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">
          Profile
        </h2>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-white dark:bg-[#1a1a1a] dark:border-[#333]">
          <Row label="Email" value={authSession.email ?? '—'} />
          <Row label="Name" value={[authSession.firstName, authSession.lastName].filter(Boolean).join(' ') || '—'} />
          <Row label="Role" value={authSession.roles.join(', ') || '—'} />
        </div>
      </section>

      {/* Appearance */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">
          Appearance
        </h2>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-white px-5 py-4 dark:bg-[#1a1a1a] dark:border-[#333]">
          <div>
            <p className="text-sm font-medium text-black dark:text-white">Dark mode</p>
            <p className="mt-0.5 text-xs text-medium-gray">
              Preference is saved in a browser cookie.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Toggle dark mode"
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
              theme === 'dark' ? 'bg-black' : 'bg-border'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>
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
