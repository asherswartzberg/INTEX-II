import { useEffect, useState, useMemo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import {
  ApiError,
  fetchAdminDashboard,
  fetchDonationAllocations,
  fetchIncidentReports,
  fetchDonationTrends,
  fetchReintegrationSummary,
} from '../apis'
import { useAuth } from '../context/AuthContext'
import type { AdminDashboardDto, DonationTrendPointDto, ReintegrationStatusCountDto } from '../types/apiDtos'
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

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
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
    { i: 'kpi', x: 0, y: 0, w: 3, h: 3, minH: 2 },
    { i: 'donation-trends', x: 0, y: 2, w: 2, h: 4, minH: 3 },
    { i: 'funds-area', x: 2, y: 2, w: 1, h: 4, minH: 3 },
    { i: 'recent-donations', x: 0, y: 6, w: 2, h: 5, minH: 3 },
    { i: 'safehouse-stats', x: 2, y: 6, w: 1, h: 5, minH: 3 },
    { i: 'incidents', x: 0, y: 11, w: 1, h: 4, minH: 3 },
    { i: 'reintegration', x: 1, y: 11, w: 1, h: 4, minH: 3 },
    { i: 'conferences', x: 2, y: 11, w: 1, h: 4, minH: 3 },
  ],
  md: [
    { i: 'kpi', x: 0, y: 0, w: 2, h: 3 },
    { i: 'donation-trends', x: 0, y: 2, w: 2, h: 4 },
    { i: 'funds-area', x: 0, y: 6, w: 1, h: 4 },
    { i: 'safehouse-stats', x: 1, y: 6, w: 1, h: 4 },
    { i: 'recent-donations', x: 0, y: 10, w: 2, h: 5 },
    { i: 'incidents', x: 0, y: 15, w: 1, h: 4 },
    { i: 'reintegration', x: 1, y: 15, w: 1, h: 4 },
    { i: 'conferences', x: 0, y: 19, w: 2, h: 4 },
  ],
  sm: [
    { i: 'kpi', x: 0, y: 0, w: 1, h: 3 },
    { i: 'donation-trends', x: 0, y: 3, w: 1, h: 4 },
    { i: 'funds-area', x: 0, y: 7, w: 1, h: 4 },
    { i: 'recent-donations', x: 0, y: 11, w: 1, h: 5 },
    { i: 'safehouse-stats', x: 0, y: 16, w: 1, h: 4 },
    { i: 'incidents', x: 0, y: 20, w: 1, h: 4 },
    { i: 'reintegration', x: 0, y: 24, w: 1, h: 4 },
    { i: 'conferences', x: 0, y: 28, w: 1, h: 4 },
  ],
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Admin() {
  const { authSession } = useAuth()
  const [data, setData] = useState<AdminDashboardDto | null>(null)
  const [allocations, setAllocations] = useState<DonationAllocation[]>([])
  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [trends, setTrends] = useState<DonationTrendPointDto[]>([])
  const [reintegration, setReintegration] = useState<ReintegrationStatusCountDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Widget visibility
  const WIDGET_LABELS: Record<string, string> = {
    kpi: 'Key Metrics', 'donation-trends': 'Donation Trends', 'funds-area': 'Funds by Area',
    'recent-donations': 'Recent Donations', 'safehouse-stats': 'Safehouse Overview',
    incidents: 'Incident History', reintegration: 'Reintegration', conferences: 'Conferences',
  }
  const hiddenCookieKey = `dashboard_hidden_${authSession.email ?? 'default'}`
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
  const cookieKey = `dashboard_layout_${authSession.email ?? 'default'}`
  const [layouts, setLayouts] = useState(() => {
    const saved = getCookie(cookieKey)
    if (saved) try { return JSON.parse(saved) } catch { /* use default */ }
    return DEFAULT_LAYOUTS
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
      fetchReintegrationSummary().catch(() => [] as ReintegrationStatusCountDto[]),
    ])
      .then(([d, allocs, inc, tr, reint]) => {
        if (cancelled) return
        setData(d); setAllocations(allocs); setIncidents(inc); setTrends(tr); setReintegration(reint)
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
      id: 'safehouse-stats',
      element: (
        <div key="safehouse-stats">
          <Widget title="Safehouse Overview">
            <div className="divide-y divide-gray-50 dark:divide-[#333]">
              {data.activeResidentsBySafehouse.map(sh => {
                const progress = data.latestMonthlyProgressBySafehouse.find(p => p.safehouseId === sh.safehouseId)
                return (
                  <div key={sh.safehouseId} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {(sh.safehouseName ?? `SH-${sh.safehouseId}`).replace(/Lighthouse/gi, 'Faro')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{sh.activeResidentCount}</span>
                    </div>
                    {progress && (
                      <div className="mt-1 flex gap-3 text-[10px] text-gray-400">
                        {progress.avgHealthScore != null && <span>Health: {progress.avgHealthScore.toFixed(1)}</span>}
                        {progress.avgEducationProgress != null && <span>Edu: {progress.avgEducationProgress.toFixed(0)}%</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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
  ]

  return (
    <div className="min-h-screen bg-off-white dark:bg-[#111] px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-400">Drag widgets to customize your view</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="relative">
            <button
              onClick={() => setShowWidgetMenu(!showWidgetMenu)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:bg-[#1a1a1a] dark:border-[#333] dark:text-gray-400"
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
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:bg-[#1a1a1a] dark:border-[#333] dark:text-gray-400"
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
        margin={[16, 16]}
      >
        {widgetItems.filter(widget => !hiddenWidgets.has(widget.id)).map(widget => widget.element)}
      </ResponsiveGrid>
    </div>
  )
}
