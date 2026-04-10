import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router'
import {
  ApiError,
  fetchAdminDashboard,
  fetchDonorRiskScores,
  fetchResidentRiskScores,
  fetchIncidentReports,
  fetchResidents,
  fetchSafehouses,
  fetchSupporters,
  createIncidentReport,
  updateIncidentReport,
} from '../apis'
import type { AdminDashboardDto } from '../types/apiDtos'
import type { DonorRiskScore } from '../types/DonorRiskScore'
import type { ResidentRiskScore } from '../types/ResidentRiskScore'
import type { IncidentReport } from '../types/IncidentReport'
import type { Resident } from '../types/Resident'
import type { Supporter } from '../types/Supporter'
import type { Safehouse } from '../types/Safehouse'
import { useAuth } from '../context/AuthContext'

const SEVERITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const INCIDENT_TYPES = ['Medical', 'Security', 'RunawayAttempt', 'Behavioral', 'SelfHarm', 'ConflictWithPeer', 'PropertyDamage']
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function Card({ id, title, icon, actions, children }: { id?: string; title: string; icon: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
      <div className="flex items-center gap-2.5 border-b border-gray-50 px-5 py-3.5 dark:border-[#333]">
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h2>
        {actions && <div className="ml-auto">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function blankIncident(): IncidentReport {
  return {
    incidentId: 0,
    residentId: null,
    safehouseId: null,
    incidentDate: todayISO(),
    incidentType: null,
    severity: null,
    description: null,
    responseTaken: null,
    resolved: false,
    resolutionDate: null,
    reportedBy: null,
    followUpRequired: false,
  }
}

export default function Admin() {
  const { authSession } = useAuth()
  const isAdmin = authSession.roles.includes('Admin')

  const [dashboard, setDashboard] = useState<AdminDashboardDto | null>(null)
  const [donorRisks, setDonorRisks] = useState<DonorRiskScore[]>([])
  const [residentRisks, setResidentRisks] = useState<ResidentRiskScore[]>([])
  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [residents, setResidents] = useState<Resident[]>([])
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null)
  const [confirmResolve, setConfirmResolve] = useState(false)
  const [resolveResponseText, setResolveResponseText] = useState('')
  const [creatingIncident, setCreatingIncident] = useState(false)
  const [incidentForm, setIncidentForm] = useState<IncidentReport>(blankIncident())
  const [savingIncident, setSavingIncident] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchAdminDashboard(),
      fetchDonorRiskScores().catch(() => [] as DonorRiskScore[]),
      fetchResidentRiskScores().catch(() => [] as ResidentRiskScore[]),
      fetchIncidentReports({ pageSize: 500 }).catch(() => [] as IncidentReport[]),
      fetchResidents({ pageSize: 500 }).catch(() => [] as Resident[]),
      fetchSafehouses().catch(() => [] as Safehouse[]),
      fetchSupporters({ pageSize: 500 }).catch(() => [] as Supporter[]),
    ])
      .then(([dash, dr, rr, inc, res, sh, sup]) => {
        if (cancelled) return
        setDashboard(dash)
        setDonorRisks(dr)
        setResidentRisks(rr)
        setIncidents(inc)
        setResidents(res)
        setSafehouses(sh)
        setSupporters(sup)
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

  const validSupporterIds = useMemo(() => {
    const ids = new Set<number>()
    supporters.forEach(s => ids.add(s.supporterId))
    return ids
  }, [supporters])

  const highRiskDonors = useMemo(
    () => donorRisks
      .filter(d => d.riskLabel === 'High Risk' && validSupporterIds.has(d.supporterId))
      .sort((a, b) => (b.churnRiskScore ?? 0) - (a.churnRiskScore ?? 0)),
    [donorRisks, validSupporterIds],
  )

  const highRiskResidents = useMemo(
    () => residentRisks
      .filter(r => {
        if (r.riskLabel !== 'High Risk') return false
        const resident = residentMap.get(r.residentId)
        return resident?.caseStatus === 'Active'
      })
      .sort((a, b) => (b.incidentRiskScore ?? 0) - (a.incidentRiskScore ?? 0)),
    [residentRisks, residentMap],
  )

  const unresolvedIncidents = useMemo(
    () => incidents
      .filter(i => i.resolved === false)
      .sort((a, b) => (SEVERITY_ORDER[a.severity ?? ''] ?? 99) - (SEVERITY_ORDER[b.severity ?? ''] ?? 99)),
    [incidents],
  )

  const unresolvedTotal = useMemo(
    () => incidents.filter(i => i.resolved === false).length,
    [incidents],
  )

  const handleResolve = useCallback(async () => {
    if (!selectedIncident) return
    setSavingIncident(true)
    try {
      const updated: IncidentReport = {
        ...selectedIncident,
        resolved: true,
        resolutionDate: todayISO(),
        description: selectedIncident.description ?? '',
        responseTaken: resolveResponseText || selectedIncident.responseTaken || '',
        reportedBy: selectedIncident.reportedBy ?? '',
        followUpRequired: selectedIncident.followUpRequired ?? false,
      }
      await updateIncidentReport(selectedIncident.incidentId, updated)
      setIncidents(prev => prev.map(i => i.incidentId === selectedIncident.incidentId ? updated : i))
      setSelectedIncident(null)
      setConfirmResolve(false)
      setResolveResponseText('')
    } catch (err) {
      console.error('Resolve failed', err)
    } finally {
      setSavingIncident(false)
    }
  }, [selectedIncident, resolveResponseText])

  const handleCreateIncident = useCallback(async () => {
    setSavingIncident(true)
    try {
      const payload: IncidentReport = {
        ...incidentForm,
        description: incidentForm.description ?? '',
        responseTaken: incidentForm.responseTaken ?? '',
        reportedBy: incidentForm.reportedBy ?? '',
        followUpRequired: incidentForm.followUpRequired ?? false,
        resolved: incidentForm.resolved ?? false,
      }
      const created = await createIncidentReport(payload)
      setIncidents(prev => [...prev, created])
      setCreatingIncident(false)
      setIncidentForm(blankIncident())
    } catch (err) {
      console.error('Create failed', err)
    } finally {
      setSavingIncident(false)
    }
  }, [incidentForm])

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

      {/* OKR banner */}
      {(() => {
        const pct = dashboard.totalSupporters > 0
          ? Math.round((dashboard.supportersDonatedThisMonth / dashboard.totalSupporters) * 100)
          : 0
        return (
          <div className="mb-4 flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{pct}%</span>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">Monthly Donor Engagement</p>
              <p className="text-xs text-gray-400">{pct}% of donors contributed this month ({dashboard.supportersDonatedThisMonth} of {dashboard.totalSupporters})</p>
            </div>
          </div>
        )
      })()}

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link to="/admin/caseload/information" className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm transition-colors hover:bg-gray-50 dark:bg-[#1a1a1a] dark:border-[#333] dark:hover:bg-[#222]">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.totalActiveResidents}</p>
          <p className="mt-0.5 text-xs text-gray-400">Active Residents</p>
        </Link>
        <button onClick={() => document.getElementById('card-donors')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm text-left transition-colors hover:bg-gray-50 dark:bg-[#1a1a1a] dark:border-[#333] dark:hover:bg-[#222]">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{highRiskDonors.length}</p>
          <p className="mt-0.5 text-xs text-gray-400">Donors at Churn Risk</p>
        </button>
        <button onClick={() => document.getElementById('card-residents')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm text-left transition-colors hover:bg-gray-50 dark:bg-[#1a1a1a] dark:border-[#333] dark:hover:bg-[#222]">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{highRiskResidents.length}</p>
          <p className="mt-0.5 text-xs text-gray-400">High-Risk Residents</p>
        </button>
        <button onClick={() => document.getElementById('card-incidents')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm text-left transition-colors hover:bg-gray-50 dark:bg-[#1a1a1a] dark:border-[#333] dark:hover:bg-[#222]">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{unresolvedTotal}</p>
          <p className="mt-0.5 text-xs text-gray-400">Unresolved Incidents</p>
        </button>
      </div>

      {/* Alert cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Donor Churn Alerts */}
        <Card
          id="card-donors"
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
              {highRiskDonors.slice(0, 5).map(d => (
                <Link key={d.supporterId} to={`/admin/donors?donor=${d.supporterId}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50 dark:hover:bg-[#222] -mx-5 px-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{d.displayName ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{d.supporterType ?? '—'} · Last active {d.recencyDays ?? '?'} days ago</p>
                    {d.topFactors && <p className="mt-1 text-xs text-gray-400 truncate">Factors: {d.topFactors}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                    {d.churnRiskScore != null ? `${Math.round(d.churnRiskScore * 100)}%` : 'High'}
                  </span>
                </Link>
              ))}
              {highRiskDonors.length > 5 && (
                <div className="pt-3">
                  <Link to="/admin/donors?sort=churnRisk" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    View all {highRiskDonors.length} at-risk donors →
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Resident Incident Risk Alerts */}
        <Card
          id="card-residents"
          title={`Resident Incident Risk (${highRiskResidents.length})`}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        >
          {highRiskResidents.length === 0 ? (
            <p className="text-sm text-gray-400">No active residents flagged as high incident risk.</p>
          ) : (
            <div className="space-y-0 divide-y divide-gray-50 dark:divide-[#333]">
              {highRiskResidents.slice(0, 5).map(r => {
                const resident = residentMap.get(r.residentId)
                return (
                  <Link key={r.residentId} to={`/admin/caseload/information?resident=${r.residentId}`} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50 dark:hover:bg-[#222] -mx-5 px-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {resident?.internalCode ?? resident?.caseControlNo ?? `Resident #${r.residentId}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        SH-{resident?.safehouseId ?? '?'} · {resident?.caseStatus ?? '—'}
                      </p>
                      {r.topFactors && <p className="mt-1 text-xs text-gray-400 truncate">Factors: {r.topFactors}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                      {r.incidentRiskScore != null ? `${Math.round(r.incidentRiskScore * 100)}%` : 'High'}
                    </span>
                  </Link>
                )
              })}
              {highRiskResidents.length > 5 && (
                <div className="pt-3">
                  <Link to="/admin/caseload/information?sort=predictedRisk" className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    View all {highRiskResidents.length} high-risk residents →
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Unresolved Incidents */}
        <Card
          id="card-incidents"
          title={`Unresolved Incidents (${unresolvedTotal})`}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
          actions={isAdmin ? (
            <button
              onClick={() => { setCreatingIncident(true); setIncidentForm(blankIncident()) }}
              className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              + Report Incident
            </button>
          ) : undefined}
        >
          {unresolvedIncidents.length === 0 ? (
            <p className="text-sm text-gray-400">All incidents resolved.</p>
          ) : (
            <div className="max-h-[320px] overflow-y-auto -mx-5 px-5">
            <div className="space-y-0 divide-y divide-gray-50 dark:divide-[#333]">
              {unresolvedIncidents.map(inc => {
                const resident = inc.residentId ? residentMap.get(inc.residentId) : null
                const severityColor = inc.severity === 'Critical' || inc.severity === 'High'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : inc.severity === 'Medium'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-400'
                return (
                  <button key={inc.incidentId} onClick={() => setSelectedIncident(inc)} className="flex w-full items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 text-left transition-colors hover:bg-gray-50 dark:hover:bg-[#222] -mx-5 px-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{inc.incidentType ?? 'Incident'}</p>
                      <p className="text-xs text-gray-400">
                        {resident?.internalCode ?? `Resident #${inc.residentId}`} · {fmtDate(inc.incidentDate)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityColor}`}>
                      {inc.severity ?? '—'}
                    </span>
                  </button>
                )
              })}
            </div>
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

      {/* Incident Detail Modal */}
      {selectedIncident && !confirmResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setSelectedIncident(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1a1a1a]" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Incident Detail</h3>
              <button onClick={() => setSelectedIncident(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              {[
                ['Type', selectedIncident.incidentType],
                ['Severity', selectedIncident.severity],
                ['Date', fmtDate(selectedIncident.incidentDate)],
                ['Resident', (() => {
                  const r = selectedIncident.residentId ? residentMap.get(selectedIncident.residentId) : null
                  return r?.internalCode ?? (selectedIncident.residentId ? `#${selectedIncident.residentId}` : '—')
                })()],
                ['Safehouse', selectedIncident.safehouseId ? `SH-${selectedIncident.safehouseId}` : '—'],
                ['Reported By', selectedIncident.reportedBy],
                ['Follow-up Required', selectedIncident.followUpRequired ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-4">
                  <dt className="text-gray-400 dark:text-gray-500 shrink-0">{label}</dt>
                  <dd className="text-right font-medium text-gray-700 dark:text-gray-200">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>

            {selectedIncident.description && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500">DESCRIPTION</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedIncident.description}</p>
              </div>
            )}

            {selectedIncident.responseTaken && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500">RESPONSE TAKEN</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedIncident.responseTaken}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setSelectedIncident(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#222]">
                Close
              </button>
              {isAdmin && !selectedIncident.resolved && (
                <button
                  onClick={() => setConfirmResolve(true)}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolve Confirmation */}
      {confirmResolve && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setConfirmResolve(false); setResolveResponseText('') }}>
          <div className="mx-4 w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 shadow-xl dark:bg-[#1a1a1a] dark:border-[#333]" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resolve incident</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to mark this {selectedIncident.incidentType ?? 'incident'} as resolved?
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Response Taken</label>
              <textarea
                value={resolveResponseText}
                onChange={e => setResolveResponseText(e.target.value)}
                placeholder="Describe the response or actions taken..."
                className="min-h-20 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setConfirmResolve(false); setResolveResponseText('') }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#222]">
                Cancel
              </button>
              <button onClick={handleResolve} disabled={savingIncident} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
                {savingIncident ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Incident Modal */}
      {creatingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setCreatingIncident(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1a1a1a]" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Report New Incident</h3>
              <button onClick={() => setCreatingIncident(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Resident</label>
                <select
                  value={incidentForm.residentId ?? ''}
                  onChange={e => setIncidentForm(prev => ({ ...prev, residentId: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100"
                >
                  <option value="">Select resident...</option>
                  {residents
                    .filter(r => r.caseStatus === 'Active')
                    .sort((a, b) => (a.internalCode ?? a.caseControlNo ?? '').localeCompare(b.internalCode ?? b.caseControlNo ?? ''))
                    .map(r => (
                      <option key={r.residentId} value={r.residentId}>
                        {r.internalCode ?? r.caseControlNo ?? `#${r.residentId}`}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Safehouse</label>
                <select
                  value={incidentForm.safehouseId ?? ''}
                  onChange={e => setIncidentForm(prev => ({ ...prev, safehouseId: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100"
                >
                  <option value="">Select safehouse...</option>
                  {safehouses
                    .sort((a, b) => (a.safehouseCode ?? '').localeCompare(b.safehouseCode ?? ''))
                    .map(s => (
                      <option key={s.safehouseId} value={s.safehouseId}>
                        {s.safehouseCode ?? `SH-${s.safehouseId}`}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Incident Date</label>
                <input
                  type="date"
                  value={incidentForm.incidentDate ?? ''}
                  onChange={e => setIncidentForm(prev => ({ ...prev, incidentDate: e.target.value || null }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Incident Type</label>
                <select
                  value={incidentForm.incidentType ?? ''}
                  onChange={e => setIncidentForm(prev => ({ ...prev, incidentType: e.target.value || null }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100"
                >
                  <option value="">Select type...</option>
                  {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Severity</label>
                <select
                  value={incidentForm.severity ?? ''}
                  onChange={e => setIncidentForm(prev => ({ ...prev, severity: e.target.value || null }))}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100"
                >
                  <option value="">Select severity...</option>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
                <textarea
                  value={incidentForm.description ?? ''}
                  onChange={e => setIncidentForm(prev => ({ ...prev, description: e.target.value || null }))}
                  placeholder="Describe the incident..."
                  className="min-h-20 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Reported By</label>
                <input
                  type="text"
                  value={incidentForm.reportedBy ?? ''}
                  onChange={e => setIncidentForm(prev => ({ ...prev, reportedBy: e.target.value || null }))}
                  placeholder="Name of reporter"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setCreatingIncident(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#222]">
                Cancel
              </button>
              <button
                onClick={handleCreateIncident}
                disabled={savingIncident || !incidentForm.residentId || !incidentForm.safehouseId || !incidentForm.incidentType || !incidentForm.severity}
                className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                {savingIncident ? 'Saving...' : 'Report Incident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
