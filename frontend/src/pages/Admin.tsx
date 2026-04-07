import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ApiError, fetchAdminDashboard } from '../apis'
import type { AdminDashboardDto } from '../types/apiDtos'

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(amount: number | null, currency: string | null) {
  if (amount == null) return '—'
  const symbol = (currency ?? 'PHP') === 'PHP' ? '₱' : (currency ?? '') + ' '
  return symbol + amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SAFEHOUSE_COLORS = [
  'bg-blue-600',
  'bg-yellow-700',
  'bg-green-600',
  'bg-purple-600',
  'bg-rose-600',
]

// ── Component ────────────────────────────────────────────────────────────────
export default function Admin() {
  const [data, setData] = useState<AdminDashboardDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchAdminDashboard()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg =
          err instanceof ApiError
            ? `Server error: ${err.status}${err.body ? ` — ${err.body.slice(0, 200)}` : ''}`
            : err instanceof Error
              ? err.message
              : 'Request failed'
        setError(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // ── Derived metrics ──
  const avgHealthScore = (() => {
    if (!data) return null
    const scores = data.latestMonthlyProgressBySafehouse
      .map((s) => s.avgHealthScore)
      .filter((s): s is number => s != null)
    if (!scores.length) return null
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  })()

  const thisMonthDonationsTotal = (() => {
    if (!data) return null
    const now = new Date()
    const total = data.recentDonations
      .filter((d) => {
        if (!d.donationDate) return false
        const dd = new Date(d.donationDate)
        return dd.getFullYear() === now.getFullYear() && dd.getMonth() === now.getMonth()
      })
      .reduce((sum, d) => sum + (d.amount ?? 0), 0)
    if (total === 0) return null
    return total >= 1000
      ? '₱' + (total / 1000).toFixed(0) + 'K'
      : '₱' + total.toLocaleString('en-PH')
  })()

  const totalIncidents = data?.latestMonthlyProgressBySafehouse.reduce(
    (sum, s) => sum + (s.incidentCount ?? 0),
    0
  ) ?? 0

  const maxOccupancy = data
    ? Math.max(...data.activeResidentsBySafehouse.map((s) => s.activeResidentCount), 1)
    : 1

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fffaf0] via-white to-[#f7f8fa] px-6 py-8 font-sans">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="mb-6 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#fffaf0] via-white to-[#f7f8fa] px-6 font-sans">
        <div className="rounded-xl border border-red-200 bg-red-50 px-8 py-6 text-center">
          <p className="text-sm font-semibold text-red-700">Failed to load dashboard</p>
          <p className="mt-1 text-xs text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fffaf0] via-white to-[#f7f8fa] px-6 py-8 font-sans">
      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-400">{today}</p>
        </div>
        <button className="rounded-full border border-[#e8dbc4] bg-[#fffbf3] px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-amber-500">
          + Quick action
        </button>
      </div>

      {/* ── Alerts (data-driven) ── */}
      {totalIncidents > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <span className="h-4 w-1 rounded-full bg-red-500" aria-hidden="true" />
            <span className="text-sm font-medium text-red-800">
              {totalIncidents} incident{totalIncidents !== 1 ? 's' : ''} recorded across safehouses this period
            </span>
          </div>
          <button className="text-sm font-medium text-red-600 transition hover:text-red-800">
            View
          </button>
        </motion.div>
      )}

      {data.upcomingCaseConferences.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
          className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
          role="alert"
        >
          <div className="flex items-center gap-3">
            <span className="h-4 w-1 rounded-full bg-blue-500" aria-hidden="true" />
            <span className="text-sm font-medium text-blue-800">
              {data.upcomingCaseConferences.length} upcoming case conference
              {data.upcomingCaseConferences.length !== 1 ? 's' : ''} in the next 30 days
            </span>
          </div>
          <button className="text-sm font-medium text-blue-600 transition hover:text-blue-800">
            View cases
          </button>
        </motion.div>
      )}

      {/* ── Metric Cards ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="rounded-xl border border-gray-100 bg-white px-6 py-5 shadow-sm"
        >
          <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400">ACTIVE RESIDENTS</p>
          <p className="text-3xl font-bold text-gray-900">{data.totalActiveResidents}</p>
          <p className="mt-1 text-xs font-medium text-green-600">
            across {data.activeResidentsBySafehouse.length} safehouse
            {data.activeResidentsBySafehouse.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="rounded-xl border border-gray-100 bg-white px-6 py-5 shadow-sm"
        >
          <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400">MONTHLY DONATIONS</p>
          <p className="text-3xl font-bold text-gray-900">
            {thisMonthDonationsTotal ?? '—'}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-400">
            {thisMonthDonationsTotal ? 'from recent records this month' : 'no donations this month yet'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.26 }}
          className="rounded-xl border border-gray-100 bg-white px-6 py-5 shadow-sm"
        >
          <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400">AVG HEALTH SCORE</p>
          <p className="text-3xl font-bold text-gray-900">
            {avgHealthScore != null ? `${avgHealthScore} / 5` : '—'}
          </p>
          <p className="mt-1 text-xs font-medium text-green-600">
            {avgHealthScore != null ? 'latest monthly average' : 'no data available'}
          </p>
        </motion.div>
      </div>

      {/* ── Mid Row: Conferences + Donations ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upcoming case conferences */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            Upcoming case conferences
          </h2>
          {data.upcomingCaseConferences.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming conferences.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {data.upcomingCaseConferences.map((c) => (
                  <tr key={c.planId}>
                    <td className="py-2.5 font-medium text-gray-800">
                      {c.residentCaseNo ?? `Resident #${c.residentId}`}
                    </td>
                    <td className="py-2.5 text-center text-gray-400">
                      {c.planCategory ?? '—'}
                    </td>
                    <td className="py-2.5 text-right text-gray-400">
                      {formatDate(c.caseConferenceDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* Recent donations */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.38 }}
          className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-base font-semibold text-gray-800">Recent donations</h2>
          {data.recentDonations.length === 0 ? (
            <p className="text-sm text-gray-400">No recent donations.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {data.recentDonations.map((d) => (
                  <tr key={d.donationId}>
                    <td className="py-2.5 font-medium text-gray-800">
                      {d.supporterDisplayName ?? `Supporter #${d.supporterId}`}
                    </td>
                    <td className="py-2.5 text-center text-gray-400">
                      {d.donationType ?? '—'}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-green-700">
                      {formatCurrency(d.amount, d.currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </div>

      {/* ── Safehouse Occupancy ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.46 }}
        className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-5 text-base font-semibold text-gray-800">Safehouse occupancy</h2>
        {data.activeResidentsBySafehouse.length === 0 ? (
          <p className="text-sm text-gray-400">No safehouse data available.</p>
        ) : (
          <div className="space-y-4">
            {data.activeResidentsBySafehouse.map((sh, i) => {
              const pct = Math.round((sh.activeResidentCount / maxOccupancy) * 100)
              const color = SAFEHOUSE_COLORS[i % SAFEHOUSE_COLORS.length]
              return (
                <div key={sh.safehouseId} className="flex items-center gap-4">
                  <span className="w-40 shrink-0 text-sm text-gray-400">
                    {sh.safehouseCode ?? `SH-${sh.safehouseId}`} {sh.safehouseName}
                  </span>
                  <div className="relative flex-1 h-2.5 rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={sh.activeResidentCount}
                      aria-valuemin={0}
                      aria-valuemax={maxOccupancy}
                      aria-label={`${sh.safehouseCode ?? sh.safehouseName} occupancy`}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-medium text-gray-600">
                    {sh.activeResidentCount}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ── Safehouse Health & Progress ── */}
      {data.latestMonthlyProgressBySafehouse.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.54 }}
          className="mt-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            Latest monthly progress by safehouse
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left text-xs font-semibold tracking-wide text-gray-400">
                    SAFEHOUSE
                  </th>
                  <th className="pb-3 text-center text-xs font-semibold tracking-wide text-gray-400">
                    RESIDENTS
                  </th>
                  <th className="pb-3 text-center text-xs font-semibold tracking-wide text-gray-400">
                    AVG EDUCATION
                  </th>
                  <th className="pb-3 text-center text-xs font-semibold tracking-wide text-gray-400">
                    AVG HEALTH
                  </th>
                  <th className="pb-3 text-right text-xs font-semibold tracking-wide text-gray-400">
                    INCIDENTS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.latestMonthlyProgressBySafehouse.map((sh) => (
                  <tr key={sh.safehouseId}>
                    <td className="py-3 font-medium text-gray-800">{sh.safehouseName ?? '—'}</td>
                    <td className="py-3 text-center text-gray-600">{sh.activeResidents ?? '—'}</td>
                    <td className="py-3 text-center text-gray-600">
                      {sh.avgEducationProgress != null
                        ? `${(sh.avgEducationProgress * 100).toFixed(0)}%`
                        : '—'}
                    </td>
                    <td className="py-3 text-center text-gray-600">
                      {sh.avgHealthScore != null ? sh.avgHealthScore.toFixed(1) : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          (sh.incidentCount ?? 0) > 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {sh.incidentCount ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  )
}
