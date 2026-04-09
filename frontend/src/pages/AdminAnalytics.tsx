import { useEffect, useState, useMemo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import {
  ApiError,
  fetchAdminDashboard,
  fetchDonationAllocations,
  fetchIncidentReports,
  fetchDonationTrends,
  fetchSafehousePerformance,
  fetchResidentOutcomes,
  fetchReintegrationSummary,
} from '../apis'
import { fetchEducationSummary } from '../apis/educationRecordsApi'
import type { EducationSummary } from '../apis/educationRecordsApi'
import { useAuth } from '../context/AuthContext'
import type {
  AdminDashboardDto,
  DonationTrendPointDto,
  OutcomeTrendPointDto,
  ReintegrationStatusCountDto,
  SafehousePerformanceDto,
} from '../types/apiDtos'
import type { DonationAllocation } from '../types/DonationAllocation'
import type { IncidentReport } from '../types/IncidentReport'

const ResponsiveGrid = WidthProvider(Responsive)

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(n: number | null) {
  if (n == null) return '—'
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K'
  return '$' + n.toLocaleString('en', { maximumFractionDigits: 0 })
}

function fmtDateFull(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function mergeLayoutsWithDefaults(layouts: Record<string, any[]>) {
  const merged: Record<string, any[]> = { ...layouts }
  for (const [bp, defaults] of Object.entries(DEFAULT_LAYOUTS)) {
    const existing = (merged[bp] ?? []).filter((item: any) => item.i !== 'safehouse-stats')
    const missing = (defaults as any[]).filter(
      (item: any) => item.i !== 'safehouse-stats' && !existing.some((current: any) => current.i === item.i),
    )
    merged[bp] = [...existing, ...missing]
  }
  return merged
}

// ── Widget wrapper ─────────────────────────────────────────────────────────

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-50 px-5 py-3 dark:border-[#333]">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h2>
        <span className="cursor-grab text-gray-300 dark:text-gray-600" title="Drag to reorder">⋮⋮</span>
      </div>
      <div className="flex-1 overflow-auto p-5">{children}</div>
    </div>
  )
}

// ── Default layouts ────────────────────────────────────────────────────────

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'kpi', x: 0, y: 0, w: 3, h: 2, minH: 2 },
    { i: 'donation-trends', x: 0, y: 2, w: 2, h: 4, minH: 3 },
    { i: 'funds-area', x: 2, y: 2, w: 1, h: 4, minH: 3 },
    { i: 'resident-health-trends', x: 0, y: 6, w: 2, h: 4, minH: 3 },
    { i: 'conferences', x: 2, y: 6, w: 1, h: 4, minH: 3 },
    { i: 'reintegration', x: 0, y: 10, w: 1, h: 4, minH: 3 },
    { i: 'incidents', x: 1, y: 10, w: 1, h: 4, minH: 3 },
    { i: 'recent-donations', x: 2, y: 10, w: 1, h: 4, minH: 3 },
    { i: 'safehouse-performance', x: 0, y: 14, w: 3, h: 5, minH: 4 },
    { i: 'education', x: 0, y: 19, w: 2, h: 5, minH: 4 },
  ],
  md: [
    { i: 'kpi', x: 0, y: 0, w: 2, h: 2 },
    { i: 'donation-trends', x: 0, y: 2, w: 2, h: 4 },
    { i: 'funds-area', x: 0, y: 6, w: 1, h: 4 },
    { i: 'resident-health-trends', x: 0, y: 10, w: 2, h: 4 },
    { i: 'conferences', x: 0, y: 14, w: 2, h: 4 },
    { i: 'reintegration', x: 0, y: 18, w: 1, h: 4 },
    { i: 'incidents', x: 1, y: 18, w: 1, h: 4 },
    { i: 'recent-donations', x: 0, y: 22, w: 2, h: 5 },
    { i: 'safehouse-performance', x: 0, y: 27, w: 2, h: 5, minH: 4 },
    { i: 'education', x: 0, y: 32, w: 2, h: 5, minH: 4 },
  ],
  sm: [
    { i: 'kpi', x: 0, y: 0, w: 1, h: 2 },
    { i: 'donation-trends', x: 0, y: 2, w: 1, h: 4 },
    { i: 'funds-area', x: 0, y: 6, w: 1, h: 4 },
    { i: 'resident-health-trends', x: 0, y: 10, w: 1, h: 4 },
    { i: 'conferences', x: 0, y: 14, w: 1, h: 4 },
    { i: 'reintegration', x: 0, y: 18, w: 1, h: 4 },
    { i: 'incidents', x: 0, y: 22, w: 1, h: 4 },
    { i: 'recent-donations', x: 0, y: 26, w: 1, h: 5 },
    { i: 'safehouse-performance', x: 0, y: 31, w: 1, h: 6, minH: 4 },
    { i: 'education', x: 0, y: 37, w: 1, h: 5, minH: 4 },
  ],
}

function HealthTrendLineChart({
  trends,
  maxScore,
}: {
  trends: OutcomeTrendPointDto[]
  maxScore: number
}) {
  const CHART_W = 960
  const CHART_H = 320
  const PAD_L = 52
  const PAD_R = 20
  const PAD_T = 28
  const PAD_B = 44
  const plotW = CHART_W - PAD_L - PAD_R
  const plotH = CHART_H - PAD_T - PAD_B
  const EDGE_INSET = 28
  const maxY = Math.max(maxScore, 1)
  const validTrends = [...trends]
    .filter((t) => t.avgHealthScore != null)
    .sort((a, b) => new Date(a.monthStart).getTime() - new Date(b.monthStart).getTime())
  const n = validTrends.length

  const points = validTrends.map((t, i) => {
    const score = t.avgHealthScore as number
    const normalized = n <= 1 ? 0.5 : i / (n - 1)
    const x = PAD_L + EDGE_INSET + (n <= 1 ? (plotW - EDGE_INSET * 2) / 2 : normalized * (plotW - EDGE_INSET * 2))
    const y = PAD_T + plotH - (score / maxY) * plotH
    return { x, y, t, score }
  })
  const labelEvery = Math.max(1, Math.ceil(n / 8))

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD =
    points.length > 0
      ? `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${PAD_T + plotH} L ${points[0].x.toFixed(1)} ${PAD_T + plotH} Z`
      : ''
  return (
    <div className="w-full min-w-0">
      <svg
        className="h-[min(22rem,50vw)] w-full max-w-full"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Resident health score over time"
      >
        <defs>
          <linearGradient id="healthTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(34 197 94)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(34 197 94)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const gy = PAD_T + plotH * (1 - frac)
          return (
            <g key={frac}>
              <line x1={PAD_L} y1={gy} x2={PAD_L + plotW} y2={gy} stroke="#f3f4f6" strokeWidth="1" />
              <text x={PAD_L - 8} y={gy + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
                {(maxY * frac).toFixed(1)}
              </text>
            </g>
          )
        })}
        {areaD ? <path d={areaD} fill="url(#healthTrendFill)" /> : null}
        <path d={lineD} fill="none" stroke="rgb(34 197 94)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle
            key={p.t.monthStart}
            cx={p.x}
            cy={p.y}
            r="4"
            className="fill-white stroke-green-600"
            strokeWidth="2"
          >
            <title>{`${monthLabel(new Date(p.t.monthStart).getFullYear(), new Date(p.t.monthStart).getMonth() + 1)}: ${p.score.toFixed(1)}`}</title>
          </circle>
        ))}
        {points.map((p, i) => {
          const isVisible = i % labelEvery === 0 || i === points.length - 1
          if (!isVisible) return null
          const isFirst = i === 0
          const isLast = i === points.length - 1
          return (
            <text
              key={`lbl-${p.t.monthStart}`}
              x={p.x}
              y={CHART_H - 12}
              textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
              className="fill-gray-500 text-[10px]"
            >
              {monthLabel(new Date(p.t.monthStart).getFullYear(), new Date(p.t.monthStart).getMonth() + 1)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function SafehousePerformanceWidget({
  rows,
}: {
  rows: SafehousePerformanceDto[]
}) {
  const rowsByMonth = new Map<string, SafehousePerformanceDto[]>()
  for (const row of rows) {
    if (!row.monthStart) continue
    const bucket = rowsByMonth.get(row.monthStart) ?? []
    bucket.push(row)
    rowsByMonth.set(row.monthStart, bucket)
  }

  const completeMonths = [...rowsByMonth.entries()]
    .filter(([, monthRows]) => monthRows.length > 0 && monthRows.every((row) =>
      row.activeResidents != null &&
      row.avgEducationProgress != null &&
      row.avgHealthScore != null &&
      row.processRecordingCount != null &&
      row.homeVisitationCount != null &&
      row.incidentCount != null
    ))
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())

  const selectedMonth = completeMonths.at(-1)?.[0] ?? [...rowsByMonth.keys()].sort().at(-1) ?? null
  const selectedRows = selectedMonth ? (rowsByMonth.get(selectedMonth) ?? []) : []
  const sortedRows = [...selectedRows].sort((a, b) => (a.safehouseId ?? 0) - (b.safehouseId ?? 0))

  return (
    <div className="w-full min-w-0">
      <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
        Month-to-date · {sortedRows.length} safehouses
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-50 dark:border-[#333]">
              <th className="px-0 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Safehouse</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Residents</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Education</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Health</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Process</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Visits</th>
              <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Incidents</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-[#333]">
            {sortedRows.map((p) => {
              const incidentCount = p.incidentCount ?? 0
              return (
                <tr key={p.safehouseId}>
                  <td className="py-3 pr-3 font-medium text-gray-800 dark:text-gray-100">
                    {(p.safehouseName ?? `SH-${p.safehouseId}`).replace(/Lighthouse/gi, 'Faro')}
                  </td>
                  <td className="px-2 py-3 text-right text-gray-600 dark:text-gray-300">{p.activeResidents ?? '—'}</td>
                  <td className="px-2 py-3 text-right text-gray-600 dark:text-gray-300">
                    {p.avgEducationProgress != null ? `${p.avgEducationProgress.toFixed(1)}%` : 'No data'}
                  </td>
                  <td className="px-2 py-3 text-right text-gray-600 dark:text-gray-300">
                    {p.avgHealthScore != null ? p.avgHealthScore.toFixed(1) : 'No data'}
                  </td>
                  <td className="px-2 py-3 text-right text-gray-600 dark:text-gray-300">{p.processRecordingCount ?? '—'}</td>
                  <td className="px-2 py-3 text-right text-gray-600 dark:text-gray-300">{p.homeVisitationCount ?? '—'}</td>
                  <td className="px-2 py-3 text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      incidentCount > 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200' : 'bg-gray-100 text-gray-500 dark:bg-[#2a2a2a] dark:text-gray-400'
                    }`}>
                      {incidentCount}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {sortedRows.length === 0 && (
        <p className="mt-3 text-sm text-gray-400">No complete month found with both education and health values.</p>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const { authSession } = useAuth()
  const [data, setData] = useState<AdminDashboardDto | null>(null)
  const [allocations, setAllocations] = useState<DonationAllocation[]>([])
  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [trends, setTrends] = useState<DonationTrendPointDto[]>([])
  const [outcomes, setOutcomes] = useState<OutcomeTrendPointDto[]>([])
  const [performance, setPerformance] = useState<SafehousePerformanceDto[]>([])
  const [reintegration, setReintegration] = useState<ReintegrationStatusCountDto[]>([])
  const [educationSummary, setEducationSummary] = useState<EducationSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Widget visibility
  const WIDGET_LABELS: Record<string, string> = {
    kpi: 'Key Metrics', 'donation-trends': 'Donation Trends', 'funds-area': 'Funds by Area',
    'resident-health-trends': 'Resident Health Over Time',
    'recent-donations': 'Recent Donations',
    'safehouse-performance': 'Safehouse Performance', incidents: 'Incident History', reintegration: 'Reintegration', conferences: 'Conferences',
    education: 'Education Overview',
  }
  const hiddenCookieKey = `analytics_hidden_${authSession.email ?? 'default'}`
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(() => {
    const saved = getCookie(hiddenCookieKey)
    if (saved) try { return new Set(JSON.parse(saved)) } catch { /* default */ }
    return new Set()
  })
  const [showWidgetMenu, setShowWidgetMenu] = useState(false)

  const toggleWidget = (id: string) => {
    setHiddenWidgets(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // Restore layout item from defaults when showing
        setLayouts((prevLayouts: Record<string, any[]>) => {
          const restored = { ...prevLayouts }
          for (const [bp, items] of Object.entries(DEFAULT_LAYOUTS)) {
            const defaultItem = (items as any[]).find((item: any) => item.i === id)
            if (defaultItem && !(restored[bp] ?? []).some((item: any) => item.i === id)) {
              restored[bp] = [...(restored[bp] ?? []), defaultItem]
            }
          }
          setCookie(cookieKey, JSON.stringify(restored), 365)
          return restored
        })
      } else {
        next.add(id)
      }
      setCookie(hiddenCookieKey, JSON.stringify([...next]), 365)
      return next
    })
  }

  // Layout persistence
  const cookieKey = `analytics_layout_${authSession.email ?? 'default'}`
  const [layouts, setLayouts] = useState(() => {
    const saved = getCookie(cookieKey)
    if (saved) try { return mergeLayoutsWithDefaults(JSON.parse(saved)) } catch { /* use default */ }
    return mergeLayoutsWithDefaults(DEFAULT_LAYOUTS)
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onLayoutChange = (_: any, allLayouts: any) => {
    setLayouts(allLayouts)
    setCookie(cookieKey, JSON.stringify(allLayouts), 365)
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchAdminDashboard(),
      fetchDonationAllocations().catch(() => [] as DonationAllocation[]),
      fetchIncidentReports({ pageSize: 500 }).catch(() => [] as IncidentReport[]),
      fetchDonationTrends().catch(() => [] as DonationTrendPointDto[]),
      fetchResidentOutcomes().catch(() => [] as OutcomeTrendPointDto[]),
      fetchSafehousePerformance().catch(() => [] as SafehousePerformanceDto[]),
      fetchReintegrationSummary().catch(() => [] as ReintegrationStatusCountDto[]),
      fetchEducationSummary().catch(() => null),
    ])
      .then(([d, allocs, inc, tr, out, perf, reint, edu]) => {
        if (cancelled) return
        setData(d); setAllocations(allocs); setIncidents(inc); setTrends(tr); setOutcomes(out); setPerformance(perf); setReintegration(reint); setEducationSummary(edu)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? `Error ${err.status}` : err instanceof Error ? err.message : 'Failed')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Derived data
  const avgHealthScore = useMemo(() => {
    if (!data) return null
    const scores = data.latestMonthlyProgressBySafehouse.map(s => s.avgHealthScore).filter((s): s is number => s != null)
    if (!scores.length) return null
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  }, [data])

  const totalDonations = useMemo(() => {
    if (!data) return 0
    return data.recentDonations.reduce((sum, d) => sum + (d.amount ?? 0), 0)
  }, [data])

  const maxHealthScore = useMemo(() => {
    const scores = outcomes.map((o) => o.avgHealthScore ?? 0)
    return Math.max(...scores, 5)
  }, [outcomes])

  const fundsByArea = useMemo(() => {
    const totals: Record<string, number> = {}
    allocations.forEach(a => {
      totals[a.programArea ?? 'Other'] = (totals[a.programArea ?? 'Other'] ?? 0) + (a.amountAllocated ?? 0)
    })
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }, [allocations])

  const incidentsByMonth = useMemo(() => {
    const byMonth: Record<string, number> = {}
    incidents.forEach(inc => {
      if (!inc.incidentDate) return
      const d = new Date(inc.incidentDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      byMonth[key] = (byMonth[key] ?? 0) + 1
    })
    return Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12)
  }, [incidents])

  // Loading
  if (loading) return (
    <div className="min-h-screen bg-off-white dark:bg-[#111] p-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200" />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-off-white dark:bg-[#111] p-8">
      <div className="rounded-xl border border-red-200 bg-red-50 px-8 py-6 text-center">
        <p className="text-sm font-semibold text-red-700">Failed to load dashboard</p>
        <p className="mt-1 text-xs text-red-500">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700">Retry</button>
      </div>
    </div>
  )

  if (!data) return null

  const visibleLayouts = Object.fromEntries(
    Object.entries(layouts).map(([bp, items]: [string, any]) => [
      bp,
      (items ?? []).filter((item: any) => !hiddenWidgets.has(item.i)),
    ])
  )

  const widgetItems = [
    {
      id: 'kpi',
      element: (
        <div key="kpi">
          <Widget title="Key Metrics">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalActiveResidents}</p>
                <p className="mt-0.5 text-xs text-gray-400">Active residents</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtCurrency(totalDonations)}</p>
                <p className="mt-0.5 text-xs text-gray-400">Recent donations</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgHealthScore ?? '—'}</p>
                <p className="mt-0.5 text-xs text-gray-400">Avg health (1-5)</p>
              </div>
            </div>
          </Widget>
        </div>
      ),
    },
    {
      id: 'donation-trends',
      element: (
        <div key="donation-trends">
          <Widget title="Donation Trends">
            {trends.length === 0 ? (
              <p className="text-sm text-gray-400">No trend data available.</p>
            ) : (
              <div className="flex h-full flex-col">
                <div className="relative flex-1">
                  {(() => {
                    const max = Math.max(...trends.map(t => t.totalAmount), 1)
                    const n = trends.length
                    const points = trends.map((t, i) => ({
                      xPct: n > 1 ? (i / (n - 1)) * 100 : 50,
                      yPct: 100 - (t.totalAmount / max) * 85 - 5,
                      amount: t.totalAmount,
                      label: `${t.month}/${t.year}`,
                    }))
                    return (
                      <>
                        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                          <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                            points={points.map(p => `${p.xPct * 10},${p.yPct * 10}`).join(' ')}
                          />
                        </svg>
                        {points.map((p, i) => (
                          <div
                            key={i}
                            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 transition-transform hover:scale-150 hover:bg-blue-600"
                            style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
                            title={`${fmtCurrency(p.amount)} — ${p.label}`}
                          />
                        ))}
                      </>
                    )
                  })()}
                </div>
                <div className="flex shrink-0 text-[9px] text-gray-400">
                  {trends.map((t, i) => (
                    <span key={i} className="flex-1 text-center" style={{ visibility: i % 3 === 0 || i === trends.length - 1 ? 'visible' : 'hidden' }}>
                      {new Date(t.year, t.month - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Widget>
        </div>
      ),
    },
    {
      id: 'resident-health-trends',
      element: (
        <div key="resident-health-trends">
          <Widget title="Resident Health Score Over Time">
            {outcomes.length === 0 ? (
              <p className="text-sm text-gray-400">No health trend data available.</p>
            ) : (
              <HealthTrendLineChart trends={outcomes} maxScore={maxHealthScore} />
            )}
          </Widget>
        </div>
      ),
    },
    {
      id: 'funds-area',
      element: (
        <div key="funds-area">
          <Widget title="Funds by Area">
            {fundsByArea.length === 0 ? (
              <p className="text-sm text-gray-400">No allocation data.</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const max = Math.max(...fundsByArea.map(([, v]) => v), 1)
                  return fundsByArea.map(([area, amount]) => (
                    <div key={area}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{area}</span>
                        <span className="text-gray-400">{fmtCurrency(amount)}</span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-gray-100 dark:bg-[#333]">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(amount / max) * 100}%` }} />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}
          </Widget>
        </div>
      ),
    },
    {
      id: 'recent-donations',
      element: (
        <div key="recent-donations">
          <Widget title="Recent Donations">
            {data.recentDonations.length === 0 ? (
              <p className="text-sm text-gray-400">No recent donations.</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-[#333]">
                {data.recentDonations.slice(0, 10).map(d => (
                  <div key={d.donationId} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{d.supporterDisplayName ?? 'Anonymous'}</p>
                      <p className="text-xs text-gray-400">{fmtDateFull(d.donationDate)} · {d.donationType ?? '—'}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmtCurrency(d.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Widget>
        </div>
      ),
    },
    {
      id: 'safehouse-performance',
      element: (
        <div key="safehouse-performance">
          <Widget title="Safehouse Performance">
            {performance.length === 0 ? (
              <p className="text-sm text-gray-400">No latest-month performance data available.</p>
            ) : (
              <SafehousePerformanceWidget rows={performance} />
            )}
          </Widget>
        </div>
      ),
    },
    {
      id: 'incidents',
      element: (
        <div key="incidents">
          <Widget title="Incident History">
            {incidentsByMonth.length === 0 ? (
              <p className="text-sm text-gray-400">No incidents recorded.</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...incidentsByMonth.map(([, v]) => v), 1)
                  return incidentsByMonth.map(([month, count]) => (
                    <div key={month} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-[10px] text-gray-400">
                        {new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' })}
                      </span>
                      <div className="h-3 flex-1 rounded-full bg-gray-100 dark:bg-[#333]">
                        <div
                          className={`h-full rounded-full transition-all ${count === 0 ? 'bg-green-300' : count <= 2 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.max((count / max) * 100, 4)}%` }}
                        />
                      </div>
                      <span className={`w-5 shrink-0 text-right text-xs font-semibold ${count === 0 ? 'text-green-500' : count <= 2 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {count}
                      </span>
                    </div>
                  ))
                })()}
                <p className="mt-1 text-[10px] text-gray-400">{incidents.length} total across all months</p>
              </div>
            )}
          </Widget>
        </div>
      ),
    },
    {
      id: 'reintegration',
      element: (
        <div key="reintegration">
          <Widget title="Reintegration Summary">
            {reintegration.length === 0 ? (
              <p className="text-sm text-gray-400">No data.</p>
            ) : (
              <div className="space-y-2.5">
                {(() => {
                  const total = reintegration.reduce((s, r) => s + r.count, 0)
                  const colors: Record<string, string> = { Active: 'bg-blue-500', Reintegrated: 'bg-green-500', Transferred: 'bg-purple-500', Closed: 'bg-gray-400' }
                  return reintegration.map(r => (
                    <div key={r.status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{r.status ?? 'Unknown'}</span>
                        <span className="text-gray-400">{r.count} <span className="text-[10px]">({total ? Math.round((r.count / total) * 100) : 0}%)</span></span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded-full bg-gray-100 dark:bg-[#333]">
                        <div className={`h-full rounded-full ${colors[r.status ?? ''] ?? 'bg-gray-400'}`} style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}
          </Widget>
        </div>
      ),
    },
    {
      id: 'conferences',
      element: (
        <div key="conferences">
          <Widget title="Recent Conferences">
            {data.upcomingCaseConferences.length === 0 ? (
              <p className="text-sm text-gray-400">No upcoming conferences.</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-[#333]">
                {data.upcomingCaseConferences.slice(0, 8).map(c => (
                  <div key={c.planId} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.residentCaseNo ?? `#${c.residentId}`}</p>
                      <p className="text-[10px] text-gray-400">{c.planCategory}</p>
                    </div>
                    <span className="text-xs text-gray-500">{fmtDateFull(c.caseConferenceDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </Widget>
        </div>
      ),
    },
    {
      id: 'education',
      element: (
        <div key="education">
          <Widget title="Education Overview">
            {!educationSummary ? (
              <p className="text-sm text-gray-400">No education data available.</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-off-white px-3 py-3 text-center dark:bg-[#111]">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{educationSummary.totalRecords}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">Total Records</p>
                  </div>
                  <div className="rounded-lg bg-off-white px-3 py-3 text-center dark:bg-[#111]">
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {educationSummary.averageAttendanceRate != null ? `${educationSummary.averageAttendanceRate}%` : '—'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">Avg Attendance</p>
                  </div>
                  <div className="rounded-lg bg-off-white px-3 py-3 text-center dark:bg-[#111]">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {educationSummary.averageProgressPercent != null ? `${educationSummary.averageProgressPercent}%` : '—'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-400">Avg Progress</p>
                  </div>
                </div>

                {educationSummary.averageProgressPercent != null && (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Overall Progress</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{educationSummary.averageProgressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-[#333]">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(educationSummary.averageProgressPercent, 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {educationSummary.completionBreakdown.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Completion</p>
                      <div className="space-y-1.5">
                        {educationSummary.completionBreakdown.map(({ status, count }) => {
                          const p = Math.round((count / educationSummary.totalRecords) * 100)
                          const color = status === 'Completed' ? 'bg-green-500' : status === 'InProgress' ? 'bg-amber-500' : 'bg-gray-400'
                          const label = status === 'InProgress' ? 'In Progress' : status === 'NotStarted' ? 'Not Started' : status
                          return (
                            <div key={status} className="flex items-center gap-2">
                              <span className="w-20 truncate text-xs text-gray-600 dark:text-gray-300">{label}</span>
                              <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-[#333]" style={{ height: 5 }}>
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
                              </div>
                              <span className="w-7 text-right text-xs text-gray-400">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {educationSummary.enrollmentBreakdown.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Enrollment</p>
                      <div className="space-y-1.5">
                        {educationSummary.enrollmentBreakdown.map(({ status, count }) => {
                          const p = Math.round((count / educationSummary.totalRecords) * 100)
                          return (
                            <div key={status} className="flex items-center gap-2">
                              <span className="w-20 truncate text-xs text-gray-600 dark:text-gray-300">{status}</span>
                              <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-[#333]" style={{ height: 5 }}>
                                <div className="h-full rounded-full bg-blue-500" style={{ width: `${p}%` }} />
                              </div>
                              <span className="w-7 text-right text-xs text-gray-400">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Widget>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-off-white dark:bg-[#111] px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="mt-0.5 text-sm text-gray-400">Drag widgets to customize your view</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="relative">
            <button
              onClick={() => setShowWidgetMenu(!showWidgetMenu)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all duration-150 hover:-translate-y-px hover:border-gray-300 hover:bg-gray-100 hover:text-black hover:shadow-md dark:bg-[#1a1a1a] dark:border-[#333] dark:text-gray-400 dark:hover:-translate-y-px dark:hover:border-[#555] dark:hover:bg-[#2a2a2a] dark:hover:text-white dark:hover:shadow-[0_10px_20px_rgba(0,0,0,0.35)] dark:hover:ring-1 dark:hover:ring-white/10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3h7a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7m-4 8h8"/></svg>
              Widgets
            </button>
            {showWidgetMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowWidgetMenu(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-2 shadow-lg dark:bg-[#1a1a1a] dark:border-[#333]">
                  {Object.entries(WIDGET_LABELS).map(([id, label]) => (
                    <label key={id} className="flex cursor-pointer items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-[#222]">
                      <input
                        type="checkbox"
                        checked={!hiddenWidgets.has(id)}
                        onChange={() => toggleWidget(id)}
                        className="h-3.5 w-3.5 rounded border-gray-300"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setLayouts(DEFAULT_LAYOUTS)
              setCookie(cookieKey, JSON.stringify(DEFAULT_LAYOUTS), 365)
              setHiddenWidgets(new Set())
              setCookie(hiddenCookieKey, JSON.stringify([]), 365)
            }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all duration-150 hover:-translate-y-px hover:border-gray-300 hover:bg-gray-100 hover:text-black hover:shadow-md dark:bg-[#1a1a1a] dark:border-[#333] dark:text-gray-400 dark:hover:-translate-y-px dark:hover:border-[#555] dark:hover:bg-[#2a2a2a] dark:hover:text-white dark:hover:shadow-[0_10px_20px_rgba(0,0,0,0.35)] dark:hover:ring-1 dark:hover:ring-white/10"
          >
            Reset layout
          </button>
        </div>
      </div>

      {/* Grid */}
      <ResponsiveGrid
        className="layout"
        layouts={visibleLayouts}
        breakpoints={{ lg: 800, md: 500, sm: 0 }}
        cols={{ lg: 3, md: 2, sm: 1 }}
        rowHeight={60}
        onLayoutChange={onLayoutChange}
        draggableHandle=".cursor-grab"
        compactType="vertical"
        margin={[12, 12]}
      >
        {widgetItems.filter(widget => !hiddenWidgets.has(widget.id)).map(widget => widget.element)}
      </ResponsiveGrid>
    </div>
  )
}
