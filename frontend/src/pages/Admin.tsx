import { motion } from 'framer-motion'

// ── Mock data (replace with API calls) ──────────────────────────────────────
const alerts = [
  {
    id: 1,
    level: 'high',
    message: 'High-severity incident at SH-03',
    meta: '2h ago',
    action: 'View',
  },
  {
    id: 2,
    level: 'warning',
    message: '5 process recordings flagged concerns this week',
    meta: null,
    action: 'Review',
  },
  {
    id: 3,
    level: 'info',
    message: '3 residents approaching reintegration readiness',
    meta: null,
    action: 'View cases',
  },
]

const metrics = [
  {
    label: 'ACTIVE RESIDENTS',
    value: '47',
    sub: 'across 5 safehouses',
    subColor: 'text-green-600',
  },
  {
    label: 'MONTHLY DONATIONS',
    value: '₱284K',
    sub: '+12% vs last month',
    subColor: 'text-green-600',
  },
  {
    label: 'AVG HEALTH SCORE',
    value: '3.8 / 5',
    sub: 'slight improvement',
    subColor: 'text-green-600',
  },
]

const conferences = [
  { code: 'R-0012', name: 'Ana', safehouse: 'SH-01', date: 'Apr 7' },
  { code: 'R-0031', name: 'Grace', safehouse: 'SH-02', date: 'Apr 8' },
  { code: 'R-0045', name: 'Joy', safehouse: 'SH-01', date: 'Apr 9' },
  { code: 'R-0058', name: 'Faith', safehouse: 'SH-03', date: 'Apr 10' },
]

const recentDonations = [
  { donor: 'J. Cruz', campaign: 'Year-End Hope', amount: '₱15,000' },
  { donor: 'Hope Foundation', campaign: 'Direct', amount: '₱50,000' },
  { donor: 'M. Reyes', campaign: 'GivingTuesday', amount: '₱3,500' },
  { donor: 'L. Padilla', campaign: 'Back to School', amount: '₱8,000' },
]

const safehouses = [
  { id: 'SH-01', name: 'Luzon Haven', current: 12, capacity: 15, color: 'bg-blue-600' },
  { id: 'SH-02', name: 'Visayas Light', current: 10, capacity: 12, color: 'bg-yellow-700' },
  { id: 'SH-03', name: 'Mindanao Refuge', current: 8, capacity: 15, color: 'bg-green-600' },
]

// ── Alert styling helpers ────────────────────────────────────────────────────
const alertStyles: Record<string, { bar: string; bg: string; text: string; action: string }> = {
  high: {
    bar: 'bg-red-500',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    action: 'text-red-600 hover:text-red-800',
  },
  warning: {
    bar: 'bg-yellow-500',
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    action: 'text-yellow-600 hover:text-yellow-800',
  },
  info: {
    bar: 'bg-blue-500',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    action: 'text-blue-600 hover:text-blue-800',
  },
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Admin() {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-6 py-8 font-sans">
      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-400">{today}</p>
        </div>
        <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-amber-500">
          + Quick action
        </button>
      </div>

      {/* ── Alerts ── */}
      <div className="mb-6 space-y-2">
        {alerts.map((alert, i) => {
          const s = alertStyles[alert.level]
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 ${s.bg}`}
              role="alert"
            >
              <div className="flex items-center gap-3">
                <span className={`h-4 w-1 rounded-full ${s.bar}`} aria-hidden="true" />
                <span className={`text-sm font-medium ${s.text}`}>{alert.message}</span>
              </div>
              <div className="flex items-center gap-3">
                {alert.meta && (
                  <span className={`text-xs ${s.text} opacity-70`}>{alert.meta} —</span>
                )}
                <button className={`text-sm font-medium transition ${s.action}`}>
                  {alert.action}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Metric Cards ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 + i * 0.08 }}
            className="rounded-xl border border-gray-100 bg-white px-6 py-5 shadow-sm"
          >
            <p className="mb-2 text-xs font-semibold tracking-widest text-gray-400">{m.label}</p>
            <p className="text-3xl font-bold text-gray-900">{m.value}</p>
            <p className={`mt-1 text-xs font-medium ${m.subColor}`}>{m.sub}</p>
          </motion.div>
        ))}
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
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {conferences.map((c) => (
                <tr key={c.code} className="group">
                  <td className="py-2.5 font-medium text-gray-800">
                    {c.code} · {c.name}
                  </td>
                  <td className="py-2.5 text-center text-gray-400">{c.safehouse}</td>
                  <td className="py-2.5 text-right text-gray-400">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Recent donations */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.38 }}
          className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-base font-semibold text-gray-800">Recent donations</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {recentDonations.map((d) => (
                <tr key={d.donor + d.campaign}>
                  <td className="py-2.5 font-medium text-gray-800">{d.donor}</td>
                  <td className="py-2.5 text-center text-gray-400">{d.campaign}</td>
                  <td className="py-2.5 text-right font-semibold text-green-700">{d.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <div className="space-y-4">
          {safehouses.map((sh) => {
            const pct = Math.round((sh.current / sh.capacity) * 100)
            return (
              <div key={sh.id} className="flex items-center gap-4">
                <span className="w-36 shrink-0 text-sm text-gray-400">
                  {sh.id} {sh.name}
                </span>
                <div className="relative flex-1 h-2.5 rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${sh.color}`}
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={sh.current}
                    aria-valuemin={0}
                    aria-valuemax={sh.capacity}
                    aria-label={`${sh.id} occupancy`}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-sm text-gray-500">
                  {sh.current}/{sh.capacity}
                </span>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
