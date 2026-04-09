import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router'
import {
  ApiError,
  fetchAdminDashboard,
  fetchDonorRiskScores,
  fetchResidentRiskScores,
  fetchIncidentReports,
  fetchResidents,
} from '../apis'
import type { AdminDashboardDto } from '../types/apiDtos'
import type { DonorRiskScore } from '../types/DonorRiskScore'
import type { ResidentRiskScore } from '../types/ResidentRiskScore'
import type { IncidentReport } from '../types/IncidentReport'
import type { Resident } from '../types/Resident'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
      <div className="flex items-center gap-2.5 border-b border-gray-50 px-5 py-3.5 dark:border-[#333]">
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function Admin() {
  const [dashboard, setDashboard] = useState<AdminDashboardDto | null>(null)
  const [donorRisks, setDonorRisks] = useState<DonorRiskScore[]>([])
  const [residentRisks, setResidentRisks] = useState<ResidentRiskScore[]>([])
  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [residents, setResidents] = useState<Resident[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchAdminDashboard(),
      fetchDonorRiskScores().catch(() => [] as DonorRiskScore[]),
      fetchResidentRiskScores().catch(() => [] as ResidentRiskScore[]),
      fetchIncidentReports({ pageSize: 500 }).catch(() => [] as IncidentReport[]),
      fetchResidents({ pageSize: 500 }).catch(() => [] as Resident[]),
    ])
      .then(([dash, dr, rr, inc, res]) => {
        if (cancelled) return
        setDashboard(dash)
        setDonorRisks(dr)
        setResidentRisks(rr)
        setIncidents(inc)
        setResidents(res)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? `Error ${err.status}` : err instanceof Error ? err.message : 'Failed')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const residentMap = useMemo(() => {
    const map = new Map<number, Resident>()
    residents.forEach(r => map.set(r.residentId, r))
    return map
  }, [residents])

  const highRiskDonors = useMemo(
    () => donorRisks
      .filter(d => d.riskLabel === 'High Risk')
      .sort((a, b) => (b.churnRiskScore ?? 0) - (a.churnRiskScore ?? 0)),
    [donorRisks],
  )

  const highRiskResidents = useMemo(
    () => residentRisks
      .filter(r => r.riskLabel === 'High Risk')
      .sort((a, b) => (b.incidentRiskScore ?? 0) - (a.incidentRiskScore ?? 0)),
    [residentRisks],
  )

  const unresolvedIncidents = useMemo(
    () => incidents
      .filter(i => i.resolved === false)
      .sort((a, b) => new Date(b.incidentDate ?? 0).getTime() - new Date(a.incidentDate ?? 0).getTime())
      .slice(0, 10),
    [incidents],
  )

  if (loading) return (
    <div className="min-h-screen bg-off-white dark:bg-[#111] p-8">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-[#333]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-[#333]" />)}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-[#333]" />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-off-white dark:bg-[#111] p-8">
      <div className="rounded-xl border border-red-200 bg-red-50 px-8 py-6 text-center dark:bg-red-950 dark:border-red-800">
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">Failed to load dashboard</p>
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700">Retry</button>
      </div>
    </div>
  )

  if (!dashboard) return null

  return (
    <div className="min-h-screen bg-off-white dark:bg-[#111] px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-400">Action items and risk alerts</p>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.totalActiveResidents}</p>
          <p className="mt-0.5 text-xs text-gray-400">Active Residents</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{highRiskDonors.length}</p>
          <p className="mt-0.5 text-xs text-gray-400">Donors at Churn Risk</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{highRiskResidents.length}</p>
          <p className="mt-0.5 text-xs text-gray-400">High-Risk Residents</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{unresolvedIncidents.length}</p>
          <p className="mt-0.5 text-xs text-gray-400">Unresolved Incidents</p>
        </div>
      </div>

      {/* Alert cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Donor Churn Alerts */}
        <Card
          title={`Donor Churn Alerts (${highRiskDonors.length})`}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          }
        >
          {highRiskDonors.length === 0 ? (
            <p className="text-sm text-gray-400">No donors flagged as high churn risk.</p>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50 dark:divide-[#333]">
              {highRiskDonors.slice(0, 8).map(d => (
                <div key={d.supporterId} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{d.displayName ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{d.supporterType ?? '—'} · Last active {d.recencyDays ?? '?'} days ago</p>
                    {d.topFactors && <p className="mt-1 text-xs text-gray-400 truncate">Factors: {d.topFactors}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                    {d.churnRiskScore != null ? `${Math.round(d.churnRiskScore * 100)}%` : 'High'}
                  </span>
                </div>
              ))}
              {highRiskDonors.length > 8 && (
                <div className="pt-3">
                  <Link to="/admin/donors" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    View all {highRiskDonors.length} at-risk donors →
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Resident Incident Risk Alerts */}
        <Card
          title={`Resident Incident Risk (${highRiskResidents.length})`}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        >
          {highRiskResidents.length === 0 ? (
            <p className="text-sm text-gray-400">No residents flagged as high incident risk.</p>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50 dark:divide-[#333]">
              {highRiskResidents.slice(0, 8).map(r => {
                const resident = residentMap.get(r.residentId)
                return (
                  <div key={r.residentId} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {resident?.internalCode ?? resident?.caseControlNo ?? `Resident #${r.residentId}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        SH-{resident?.safehouseId ?? '?'} · {resident?.caseStatus ?? '—'}
                      </p>
                      {r.topFactors && <p className="mt-1 text-xs text-gray-400 truncate">Factors: {r.topFactors}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                      {r.incidentRiskScore != null ? `${Math.round(r.incidentRiskScore * 100)}%` : 'High'}
                    </span>
                  </div>
                )
              })}
              {highRiskResidents.length > 8 && (
                <div className="pt-3">
                  <Link to="/admin/caseload" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    View all {highRiskResidents.length} high-risk residents →
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Unresolved Incidents */}
        <Card
          title={`Unresolved Incidents (${incidents.filter(i => i.resolved === false).length})`}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        >
          {unresolvedIncidents.length === 0 ? (
            <p className="text-sm text-gray-400">All incidents resolved.</p>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50 dark:divide-[#333]">
              {unresolvedIncidents.map(inc => {
                const resident = inc.residentId ? residentMap.get(inc.residentId) : null
                const severityColor = inc.severity === 'Critical' || inc.severity === 'High'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : inc.severity === 'Medium'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-400'
                return (
                  <div key={inc.incidentId} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{inc.incidentType ?? 'Incident'}</p>
                      <p className="text-xs text-gray-400">
                        {resident?.internalCode ?? `Resident #${inc.residentId}`} · {fmtDate(inc.incidentDate)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityColor}`}>
                      {inc.severity ?? '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Upcoming Case Conferences */}
        <Card
          title={`Upcoming Conferences (${dashboard.upcomingCaseConferences.length})`}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        >
          {dashboard.upcomingCaseConferences.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming conferences.</p>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50 dark:divide-[#333]">
              {dashboard.upcomingCaseConferences.slice(0, 8).map(c => (
                <div key={c.planId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {c.residentCaseNo ?? `#${c.residentId}`}
                    </p>
                    <p className="text-xs text-gray-400">{c.planCategory ?? '—'} · {c.status ?? '—'}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {fmtDate(c.caseConferenceDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
