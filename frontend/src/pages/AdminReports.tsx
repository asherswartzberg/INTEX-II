import { useEffect, useState } from 'react'
import {
  fetchDonationTrends,
  fetchResidentOutcomes,
  fetchSafehousePerformance,
  fetchReintegrationSummary,
} from '../apis/analyticsApi'
import type {
  DonationTrendPointDto,
  OutcomeTrendPointDto,
  SafehousePerformanceDto,
  ReintegrationStatusCountDto,
} from '../types/apiDtos'

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return '₱' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return '₱' + (n / 1_000).toFixed(0) + 'K'
  return '₱' + n.toLocaleString()
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

const CHART_W = 960
const CHART_H = 320
const PAD_L = 52
const PAD_R = 20
const PAD_T = 28
const PAD_B = 44

function DonationTrendLineChart({
  trends,
  maxAmount,
}: {
  trends: DonationTrendPointDto[]
  maxAmount: number
}) {
  const n = trends.length
  const plotW = CHART_W - PAD_L - PAD_R
  const plotH = CHART_H - PAD_T - PAD_B
  const maxY = Math.max(maxAmount, 1)

  const points = trends.map((t, i) => {
    const x = PAD_L + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
    const y = PAD_T + plotH - (t.totalAmount / maxY) * plotH
    return { x, y, t }
  })

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD =
    points.length > 0
      ? `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${PAD_T + plotH} L ${points[0].x.toFixed(1)} ${PAD_T + plotH} Z`
      : ''

  const xLabelEvery = Math.max(1, Math.ceil(n / 12))

  return (
    <div className="w-full min-w-0">
      <svg
        className="h-[min(22rem,50vw)] w-full max-w-full"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Monthly donation totals over time"
      >
        <defs>
          <linearGradient id="donationTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const gy = PAD_T + plotH * (1 - frac)
          return (
            <g key={frac}>
              <line x1={PAD_L} y1={gy} x2={PAD_L + plotW} y2={gy} stroke="#f3f4f6" strokeWidth="1" />
              <text x={PAD_L - 8} y={gy + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
                {fmtCurrency(maxY * frac)}
              </text>
            </g>
          )
        })}
        {areaD ? <path d={areaD} fill="url(#donationTrendFill)" /> : null}
        <path d={lineD} fill="none" stroke="rgb(37 99 235)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle
            key={`${p.t.year}-${p.t.month}`}
            cx={p.x}
            cy={p.y}
            r="4"
            className="fill-white stroke-blue-600"
            strokeWidth="2"
          >
            <title>{`${monthLabel(p.t.year, p.t.month)}: ${fmtCurrency(p.t.totalAmount)}`}</title>
          </circle>
        ))}
        {points.map((p, i) =>
          i % xLabelEvery === 0 || i === n - 1 ? (
            <text
              key={`lbl-${p.t.year}-${p.t.month}`}
              x={p.x}
              y={CHART_H - 12}
              textAnchor="middle"
              className="fill-gray-500 text-[10px]"
            >
              {monthLabel(p.t.year, p.t.month)}
            </text>
          ) : null
        )}
      </svg>
    </div>
  )
}

export default function AdminReports() {
  const [trends, setTrends] = useState<DonationTrendPointDto[]>([])
  const [outcomes, setOutcomes] = useState<OutcomeTrendPointDto[]>([])
  const [performance, setPerformance] = useState<SafehousePerformanceDto[]>([])
  const [reintegration, setReintegration] = useState<ReintegrationStatusCountDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchDonationTrends(),
      fetchResidentOutcomes(),
      fetchSafehousePerformance(),
      fetchReintegrationSummary(),
    ])
      .then(([t, o, p, r]) => {
        setTrends(t)
        setOutcomes(o)
        setPerformance(p)
        setReintegration(r)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const maxTrend = Math.max(...trends.map((t) => t.totalAmount), 1)
  const maxOutcomeHealth = Math.max(...outcomes.map((o) => o.avgHealthScore ?? 0), 5)
  const totalReintegration = reintegration.reduce((s, r) => s + r.count, 0)

  return (
    <div className="min-h-full bg-[#F7F8FA] p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-white" />)}
        </div>
      ) : (
        <>
          {/* ── Donation trends ── */}
          <div className="rounded-xl border border-gray-100 bg-white p-6">
            <h2 className="mb-5 text-sm font-semibold text-gray-800">Donation trends (monthly)</h2>
            {trends.length === 0 ? (
              <p className="text-sm text-gray-400">No trend data available.</p>
            ) : (
              <DonationTrendLineChart trends={trends} maxAmount={maxTrend} />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ── Resident outcomes ── */}
            <div className="rounded-xl border border-gray-100 bg-white p-6">
              <h2 className="mb-5 text-sm font-semibold text-gray-800">Resident health score over time</h2>
              {outcomes.length === 0 ? (
                <p className="text-sm text-gray-400">No outcome data available.</p>
              ) : (
                <div className="space-y-2">
                  {outcomes.slice(-12).map((o) => {
                    const score = o.avgHealthScore ?? 0
                    const pct = Math.round((score / maxOutcomeHealth) * 100)
                    const label = new Date(o.monthStart).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                    return (
                      <div key={o.monthStart} className="flex items-center gap-3">
                        <span className="w-14 shrink-0 text-xs text-gray-400">{label}</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs font-medium text-gray-600">
                          {score.toFixed(1)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Reintegration status ── */}
            <div className="rounded-xl border border-gray-100 bg-white p-6">
              <h2 className="mb-5 text-sm font-semibold text-gray-800">Reintegration pipeline</h2>
              {reintegration.length === 0 ? (
                <p className="text-sm text-gray-400">No reintegration data available.</p>
              ) : (
                <div className="space-y-3">
                  {reintegration.map((r) => {
                    const pct = totalReintegration ? Math.round((r.count / totalReintegration) * 100) : 0
                    return (
                      <div key={r.status} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate text-sm text-gray-600">{r.status ?? 'Unknown'}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right text-sm font-semibold text-gray-700">{r.count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Safehouse performance ── */}
          <div className="rounded-xl border border-gray-100 bg-white">
            <div className="border-b border-gray-50 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-800">Safehouse performance (latest month)</h2>
            </div>
            {performance.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">No performance data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['SAFEHOUSE', 'RESIDENTS', 'AVG EDUCATION', 'AVG HEALTH', 'PROCESS RECORDINGS', 'HOME VISITS', 'INCIDENTS'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {performance.map((p) => (
                      <tr key={p.safehouseId} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">{p.safehouseName ?? `SH-${p.safehouseId}`}</td>
                        <td className="px-5 py-3 text-gray-600">{p.activeResidents ?? '—'}</td>
                        <td className="px-5 py-3 text-gray-600">
                          {p.avgEducationProgress != null
                            ? (p.avgEducationProgress * 100).toFixed(0) + '%'
                            : '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {p.avgHealthScore != null ? p.avgHealthScore.toFixed(1) : '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{p.processRecordingCount ?? '—'}</td>
                        <td className="px-5 py-3 text-gray-600">{p.homeVisitationCount ?? '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            (p.incidentCount ?? 0) > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {p.incidentCount ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
