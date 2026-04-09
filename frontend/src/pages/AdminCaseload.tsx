import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'react-router'
import { createResident, deleteResident, fetchResidents, updateResident } from '../apis/residentsApi'
import { fetchResidentRiskScores } from '../apis/residentRiskScoresApi'
import { fetchEducationRecordsForResident } from '../apis/educationRecordsApi'
import { fetchHealthRecordsForResident } from '../apis/healthWellbeingRecordsApi'
import type { Resident } from '../types/Resident'
import type { ResidentRiskScore } from '../types/ResidentRiskScore'
import type { EducationRecord } from '../types/EducationRecord'
import type { HealthWellbeingRecord } from '../types/HealthWellbeingRecord'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../context/AuthContext'

const RISK_STYLE: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
}

const PREDICTED_RISK_STYLE: Record<string, string> = {
  'Low Risk': 'bg-green-100 text-green-700',
  'Moderate Risk': 'bg-amber-100 text-amber-700',
  'High Risk': 'bg-red-100 text-red-700',
}

const STATUS_STYLE: Record<string, string> = {
  Active: 'bg-blue-100 text-blue-700',
  Closed: 'bg-gray-100 text-gray-500',
  Transferred: 'bg-purple-100 text-purple-700',
}

function calcAge(dob: string | null) {
  if (!dob) return '—'
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)) + ' y/o'
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PAGE_SIZE = 15

function blankResident(): Resident {
  return {
    residentId: 0,
    caseControlNo: null,
    internalCode: null,
    safehouseId: null,
    caseStatus: 'Active',
    sex: null,
    dateOfBirth: null,
    birthStatus: null,
    placeOfBirth: null,
    religion: null,
    caseCategory: null,
    subCatOrphaned: false,
    subCatTrafficked: false,
    subCatChildLabor: false,
    subCatPhysicalAbuse: false,
    subCatSexualAbuse: false,
    subCatOsaec: false,
    subCatCicl: false,
    subCatAtRisk: false,
    subCatStreetChild: false,
    subCatChildWithHiv: false,
    isPwd: false,
    pwdType: null,
    hasSpecialNeeds: false,
    specialNeedsDiagnosis: null,
    familyIs4ps: false,
    familySoloParent: false,
    familyIndigenous: false,
    familyParentPwd: false,
    familyInformalSettler: false,
    dateOfAdmission: null,
    ageUponAdmission: null,
    presentAge: null,
    lengthOfStay: null,
    referralSource: null,
    referringAgencyPerson: null,
    dateColbRegistered: null,
    dateColbObtained: null,
    assignedSocialWorker: null,
    initialCaseAssessment: null,
    dateCaseStudyPrepared: null,
    reintegrationType: null,
    reintegrationStatus: null,
    initialRiskLevel: null,
    currentRiskLevel: null,
    dateEnrolled: null,
    dateClosed: null,
    createdAt: null,
    notesRestricted: null,
  }
}

export default function AdminCaseload() {
  const { authSession } = useAuth()
  const isAdmin = authSession.roles.includes('Admin')
  const [searchParams, setSearchParams] = useSearchParams()
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [safehouseFilter, setSafehouseFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Resident | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Resident | null>(null)
  const [editing, setEditing] = useState<Resident | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<Resident>(blankResident())
  const [riskScores, setRiskScores] = useState<ResidentRiskScore[]>([])
  const [eduRecords, setEduRecords] = useState<EducationRecord[]>([])
  const [healthRecords, setHealthRecords] = useState<HealthWellbeingRecord[]>([])
  const [sortByRisk, setSortByRisk] = useState(() => searchParams.get('sort') === 'predictedRisk')

  useEffect(() => {
    fetchResidentRiskScores().then(setRiskScores).catch(console.error)
  }, [])

  // Auto-select resident from URL query param
  const autoSelectIdRef = React.useRef(searchParams.get('resident'))
  useEffect(() => {
    const rid = autoSelectIdRef.current
    if (rid && residents.length > 0) {
      const found = residents.find(r => r.residentId === Number(rid))
      if (found) {
        setSelected(found)
        autoSelectIdRef.current = null
        setSearchParams(prev => { prev.delete('resident'); return prev }, { replace: true })
      }
    }
  }, [residents, setSearchParams])

  useEffect(() => {
    if (!selected) {
      setEduRecords([])
      setHealthRecords([])
      return
    }
    fetchEducationRecordsForResident(selected.residentId).then(setEduRecords).catch(() => setEduRecords([]))
    fetchHealthRecordsForResident(selected.residentId).then(setHealthRecords).catch(() => setHealthRecords([]))
  }, [selected?.residentId])

  const selectedRef = React.useRef(selected)
  selectedRef.current = selected

  const refreshResidents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchResidents({
        caseStatus: statusFilter || undefined,
        safehouseId: safehouseFilter ? Number(safehouseFilter) : undefined,
        caseCategory: categoryFilter || undefined,
        search: search || undefined,
        page: 1,
        pageSize: 500,
      })
      setResidents(rows)
      if (selectedRef.current) {
        const updatedSelected = rows.find((r) => r.residentId === selectedRef.current!.residentId) ?? null
        setSelected(updatedSelected)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load residents')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, safehouseFilter, search, statusFilter])

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    try {
      await deleteResident(confirmDelete.residentId)
      await refreshResidents()
      if (selected?.residentId === confirmDelete.residentId) {
        setSelected(null)
      }
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setConfirmDelete(null)
    }
  }, [confirmDelete, refreshResidents, selected])

  useEffect(() => {
    void refreshResidents()
  }, [refreshResidents])

  const riskScoreMap = useMemo(() => {
    const m = new Map<number, ResidentRiskScore>()
    riskScores.forEach(rs => m.set(rs.residentId, rs))
    return m
  }, [riskScores])

  const filtered = useMemo(() => {
    if (!sortByRisk) return residents
    return [...residents].sort((a, b) => {
      const sa = riskScoreMap.get(a.residentId)?.incidentRiskScore ?? -1
      const sb = riskScoreMap.get(b.residentId)?.incidentRiskScore ?? -1
      return sb - sa
    })
  }, [residents, sortByRisk, riskScoreMap])

  const safehouseOptions = useMemo(
    () =>
      Array.from(new Set(residents.map((r) => r.safehouseId).filter((v): v is number => v != null))).sort(
        (a, b) => a - b
      ),
    [residents]
  )
  const categoryOptions = useMemo(
    () => Array.from(new Set(residents.map((r) => r.caseCategory).filter((v): v is string => !!v))).sort(),
    [residents]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openCreate() {
    setCreating(true)
    setEditing(null)
    setFormData(blankResident())
  }

  function openEdit(resident: Resident) {
    setCreating(false)
    setEditing(resident)
    setFormData(resident)
  }

  async function saveResident() {
    try {
      setSaving(true)
      const payload = {
        ...formData,
        caseControlNo: formData.caseControlNo || null,
        internalCode: formData.internalCode || null,
        caseCategory: formData.caseCategory || null,
        assignedSocialWorker: formData.assignedSocialWorker || null,
        referralSource: formData.referralSource || null,
        notesRestricted: formData.notesRestricted || null,
        reintegrationStatus: formData.reintegrationStatus || null,
        dateOfBirth: formData.dateOfBirth || null,
        dateOfAdmission: formData.dateOfAdmission || null,
      }
      if (editing) {
        await updateResident(editing.residentId, payload)
      } else {
        await createResident(payload)
      }
      setEditing(null)
      setCreating(false)
      await refreshResidents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function setField<K extends keyof Resident>(key: K, value: Resident[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const subCategories = (r: Resident) =>
    [
      r.subCatTrafficked && 'Trafficked',
      r.subCatChildLabor && 'Child Labor',
      r.subCatPhysicalAbuse && 'Physical Abuse',
      r.subCatSexualAbuse && 'Sexual Abuse',
      r.subCatOsaec && 'OSAEC',
      r.subCatCicl && 'CICL',
      r.subCatOrphaned && 'Orphaned',
      r.subCatAtRisk && 'At Risk',
      r.subCatStreetChild && 'Street Child',
    ].filter(Boolean)

  // Condense columns when detail panel is open to avoid horizontal scroll
  const desktopCol = selected ? 'hidden' : 'hidden md:table-cell'
  const listWidth = selected ? 'w-full md:w-[480px] md:shrink-0' : 'w-full md:flex-1'

  return (
    <div className="flex h-full gap-3 overflow-hidden p-3 bg-off-white dark:bg-[#111]">
      {/* ── List panel ── */}
      <div className={`flex flex-col rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:ring-white/5 ${listWidth} ${selected ? 'hidden md:flex' : 'flex'}`}>
        {/* Top bar */}
        <div className="border-b border-border bg-white px-6 py-4 dark:border-[#333] dark:bg-[#1a1a1a]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Caseload Inventory</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Core resident case management records</p>
            </div>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-dark-gray dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                + New Resident
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-auto">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search..."
                className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-gray-400 focus:outline-none dark:border-[#333] dark:bg-[#111] dark:text-gray-100 dark:placeholder-gray-500 sm:w-48 md:w-64"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="flex-1 rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-gray-600 focus:border-gray-400 focus:outline-none dark:border-[#333] dark:bg-[#111] dark:text-gray-300 sm:flex-none sm:px-3 sm:py-2 sm:text-sm"
            >
              <option value="">All statuses</option>
              {['Active', 'Closed', 'Transferred'].map((s) => <option key={s}>{s}</option>)}
            </select>

            <select
              value={safehouseFilter}
              onChange={(e) => { setSafehouseFilter(e.target.value); setPage(1) }}
              className="flex-1 rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-gray-600 focus:border-gray-400 focus:outline-none dark:border-[#333] dark:bg-[#111] dark:text-gray-300 sm:flex-none sm:px-3 sm:py-2 sm:text-sm"
            >
              <option value="">All safehouses</option>
              {safehouseOptions.map((s) => <option key={s} value={s}>SH-{s}</option>)}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="flex-1 rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-gray-600 focus:border-gray-400 focus:outline-none dark:border-[#333] dark:bg-[#111] dark:text-gray-300 sm:flex-none sm:px-3 sm:py-2 sm:text-sm"
            >
              <option value="">All categories</option>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <button
              onClick={() => { setSortByRisk(prev => !prev); setPage(1) }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                sortByRisk
                  ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-950 dark:text-orange-300'
                  : 'border-border bg-white text-gray-600 hover:bg-gray-50 dark:border-[#333] dark:bg-[#111] dark:text-gray-300'
              }`}
            >
              {sortByRisk ? 'Sorted by Risk ↓' : 'Sort by Risk'}
            </button>

            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{filtered.length} records</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2 p-6">
              {[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-[#1a1a1a]">
                <tr className="border-b border-gray-100 dark:border-[#333]">
                  <th scope="col" className="w-[3px] p-0" />
                  <th scope="col" className={`${desktopCol} px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400`}>CASE NO</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">CODE</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">SAFEHOUSE</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">STATUS</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">CURRENT RISK</th>
                  <th scope="col" className={`${desktopCol} cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`} onClick={() => { setSortByRisk(prev => !prev); setPage(1) }}>PREDICTED RISK{sortByRisk ? ' ↓' : ''}</th>
                  <th scope="col" className={`${desktopCol} px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400`}>CATEGORY</th>
                  <th scope="col" className={`${desktopCol} px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400`}>ADMITTED</th>
                  <th scope="col" className={`${desktopCol} px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400`}>SOCIAL WORKER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#2a2a2a]">
                {paged.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No residents found.</td></tr>
                ) : (
                  paged.map((r) => (
                    <tr
                      key={r.residentId}
                      onClick={() => setSelected(r)}
                      className={`cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40 ${selected?.residentId === r.residentId ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
                    >
                      <td className={`w-[3px] p-0 transition-colors ${selected?.residentId === r.residentId ? 'bg-blue-600' : 'bg-transparent'}`} />
                      <td className={`${desktopCol} px-4 py-3 text-gray-500 dark:text-gray-400`}>{r.caseControlNo ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{r.internalCode ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">SH-{r.safehouseId ?? '?'}</td>
                      <td className="px-4 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.caseStatus ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                          {r.caseStatus ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_STYLE[r.currentRiskLevel ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                          {r.currentRiskLevel ?? '—'}
                        </span>
                      </td>
                      <td className={`${desktopCol} px-4 py-3`}>
                        {(() => {
                          const rs = riskScores.find((s) => s.residentId === r.residentId)
                          const label = rs?.riskLabel
                          return label ? (
                            <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${PREDICTED_RISK_STYLE[label] ?? 'bg-gray-100 text-gray-500'}`}>
                              {label}
                            </span>
                          ) : '—'
                        })()}
                      </td>
                      <td className={`${desktopCol} px-4 py-3 text-gray-500 dark:text-gray-400`}>{r.caseCategory ?? '—'}</td>
                      <td className={`${desktopCol} px-4 py-3 text-gray-500 dark:text-gray-400`}>{fmtDate(r.dateOfAdmission)}</td>
                      <td className={`${desktopCol} px-4 py-3 text-gray-500 dark:text-gray-400`}>{r.assignedSocialWorker ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-3 dark:border-[#333] dark:bg-[#1a1a1a]">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {filtered.length === 0 ? '0' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)}`} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-[#222]">Prev</button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pg = i + 1
              return (
                <button key={pg} onClick={() => setPage(pg)} className={`rounded px-3 py-1 text-xs ${page === pg ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#222]'}`}>{pg}</button>
              )
            })}
            {totalPages > 5 && <span className="px-1 text-xs text-gray-400 dark:text-gray-500">…</span>}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-[#222]">Next</button>
          </div>
        </div>
      </div>

      {/* ── Detail panel (AnimatePresence for slide in/out) ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="detail-panel"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full min-w-0 flex-1 overflow-y-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:ring-white/5"
          >
            <div className="p-5">
              {/* Mobile back */}
              <button
                onClick={() => setSelected(null)}
                className="mb-3 flex items-center gap-1.5 text-sm text-medium-gray hover:text-black md:hidden"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to list
              </button>

              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-gray-800 dark:text-white">{selected.internalCode}</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[selected.caseStatus ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>{selected.caseStatus ?? '—'}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_STYLE[selected.currentRiskLevel ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>{selected.currentRiskLevel ?? '—'} Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setConfirmDelete(selected)} disabled={!isAdmin} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:bg-transparent dark:text-red-400">Delete</button>
                  <button onClick={() => openEdit(selected)} disabled={!isAdmin} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-[#444] dark:bg-transparent dark:text-gray-300">Edit</button>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>

              {/* 3-column grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

                {/* Col 1: Core details */}
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-[#222]">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Details</p>
                  <dl className="space-y-2.5 text-sm">
                    {([
                      ['Case No', selected.caseControlNo],
                      ['Age', calcAge(selected.dateOfBirth)],
                      ['Safehouse', `SH-${selected.safehouseId ?? '?'}`],
                      ['Category', selected.caseCategory],
                      ['Reintegration', selected.reintegrationStatus],
                      ['Admitted', fmtDate(selected.dateOfAdmission)],
                      ['Social Worker', selected.assignedSocialWorker],
                      ['Referral Source', selected.referralSource],
                      ['Reint. Type', selected.reintegrationType],
                    ] as [string, string | null | undefined][]).map(([label, value]) => value && (
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="shrink-0 text-gray-400">{label}</dt>
                        <dd className="text-right font-medium text-gray-700 dark:text-gray-200">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  {subCategories(selected).length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold text-gray-400">CASE FLAGS</p>
                      <div className="flex flex-wrap gap-1.5">
                        {subCategories(selected).map((c) => (
                          <span key={c as string} className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(() => {
                    const rs = riskScores.find((r) => r.residentId === selected?.residentId)
                    return rs ? (
                      <div className="mt-4 rounded-lg bg-white px-3 py-2.5 dark:bg-[#1a1a1a]">
                        <p className="mb-1.5 text-xs font-semibold text-gray-400">PREDICTED RISK</p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PREDICTED_RISK_STYLE[rs.riskLabel ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>{rs.riskLabel ?? '—'}</span>
                          {rs.incidentRiskScore != null && <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{Math.round(rs.incidentRiskScore * 100)}%</span>}
                        </div>
                        {rs.topFactors && <p className="mt-1.5 text-xs text-gray-500"><span className="font-medium text-gray-600 dark:text-gray-400">Factors:</span> {rs.topFactors}</p>}
                      </div>
                    ) : null
                  })()}

                  {(selected.isPwd || selected.hasSpecialNeeds) && (
                    <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5">
                      <p className="text-xs font-semibold text-amber-700">Special Needs</p>
                      {selected.isPwd && <p className="mt-1 text-xs text-amber-600">PWD: {selected.pwdType ?? 'Yes'}</p>}
                      {selected.hasSpecialNeeds && <p className="text-xs text-amber-600">Diagnosis: {selected.specialNeedsDiagnosis ?? 'Noted'}</p>}
                    </div>
                  )}
                </div>

                {/* Col 2: Education Records */}
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-[#222]">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Education Records <span className="normal-case font-normal text-gray-300">({eduRecords.length})</span></p>
                  {eduRecords.length === 0 ? (
                    <p className="text-xs text-gray-400">No education records found.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...eduRecords]
                        .sort((a, b) => new Date(b.recordDate ?? 0).getTime() - new Date(a.recordDate ?? 0).getTime())
                        .map(rec => (
                          <div key={rec.educationRecordId} className="rounded-lg border border-gray-100 bg-white px-3 py-2.5 dark:border-[#333] dark:bg-[#111]">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{fmtDate(rec.recordDate)}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${rec.completionStatus === 'Completed' ? 'bg-green-100 text-green-700' : rec.completionStatus === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{rec.completionStatus ?? '—'}</span>
                            </div>
                            <dl className="space-y-1.5 text-xs">
                              {rec.educationLevel && <div className="flex justify-between"><dt className="text-gray-400">Level</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.educationLevel}</dd></div>}
                              {rec.schoolName && <div className="flex justify-between"><dt className="text-gray-400">School</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.schoolName}</dd></div>}
                              {rec.enrollmentStatus && <div className="flex justify-between"><dt className="text-gray-400">Enrollment</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.enrollmentStatus}</dd></div>}
                              {rec.attendanceRate != null && <div className="flex justify-between"><dt className="text-gray-400">Attendance</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.attendanceRate.toFixed(1)}%</dd></div>}
                              {rec.progressPercent != null && <div className="flex justify-between"><dt className="text-gray-400">Progress</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.progressPercent.toFixed(1)}%</dd></div>}
                            </dl>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Col 3: Health Records */}
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-[#222]">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Health Records <span className="normal-case font-normal text-gray-300">({healthRecords.length})</span></p>
                  {healthRecords.length === 0 ? (
                    <p className="text-xs text-gray-400">No health records found.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...healthRecords]
                        .sort((a, b) => new Date(b.recordDate ?? 0).getTime() - new Date(a.recordDate ?? 0).getTime())
                        .map(rec => (
                          <div key={rec.healthRecordId} className="rounded-lg border border-gray-100 bg-white px-3 py-2.5 dark:border-[#333] dark:bg-[#111]">
                            <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-200">{fmtDate(rec.recordDate)}</p>
                            <dl className="space-y-1.5 text-xs">
                              {rec.generalHealthScore != null && <div className="flex justify-between"><dt className="text-gray-400">Health Score</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.generalHealthScore.toFixed(1)}</dd></div>}
                              {rec.nutritionScore != null && <div className="flex justify-between"><dt className="text-gray-400">Nutrition</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.nutritionScore.toFixed(1)}</dd></div>}
                              {rec.sleepQualityScore != null && <div className="flex justify-between"><dt className="text-gray-400">Sleep Quality</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.sleepQualityScore.toFixed(1)}</dd></div>}
                              {rec.energyLevelScore != null && <div className="flex justify-between"><dt className="text-gray-400">Energy Level</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.energyLevelScore.toFixed(1)}</dd></div>}
                              {(rec.heightCm != null || rec.weightKg != null) && (
                                <div className="flex justify-between">
                                  <dt className="text-gray-400">Ht / Wt</dt>
                                  <dd className="font-medium text-gray-600 dark:text-gray-300">{rec.heightCm != null ? `${rec.heightCm.toFixed(1)} cm` : '—'} / {rec.weightKg != null ? `${rec.weightKg.toFixed(1)} kg` : '—'}</dd>
                                </div>
                              )}
                              {rec.bmi != null && <div className="flex justify-between"><dt className="text-gray-400">BMI</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.bmi.toFixed(1)}</dd></div>}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {rec.medicalCheckupDone && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Medical ✓</span>}
                                {rec.dentalCheckupDone && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Dental ✓</span>}
                                {rec.psychologicalCheckupDone && <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Psych ✓</span>}
                              </div>
                            </dl>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete resident"
        message={`Are you sure you want to delete ${confirmDelete?.internalCode ?? 'this resident'}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editing ? 'Edit Resident Profile' : 'Create Resident Profile'}
              </h3>
              <button
                onClick={() => { setEditing(null); setCreating(false) }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input value={formData.caseControlNo ?? ''} onChange={(e) => setField('caseControlNo', e.target.value || null)} placeholder="Case control no" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input value={formData.internalCode ?? ''} onChange={(e) => setField('internalCode', e.target.value || null)} placeholder="Internal code" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input value={formData.assignedSocialWorker ?? ''} onChange={(e) => setField('assignedSocialWorker', e.target.value || null)} placeholder="Assigned social worker" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input value={formData.referralSource ?? ''} onChange={(e) => setField('referralSource', e.target.value || null)} placeholder="Referral source" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <select value={formData.caseStatus ?? ''} onChange={(e) => setField('caseStatus', e.target.value || null)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">Case status</option><option>Active</option><option>Closed</option><option>Transferred</option></select>
              <select value={formData.caseCategory ?? ''} onChange={(e) => setField('caseCategory', e.target.value || null)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">Case category</option><option>Trafficked</option><option>Physical Abuse</option><option>Neglected</option><option>Child Labor</option><option>At Risk</option></select>
              <input type="number" value={formData.safehouseId ?? ''} onChange={(e) => setField('safehouseId', e.target.value ? Number(e.target.value) : null)} placeholder="Safehouse ID" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input value={formData.reintegrationStatus ?? ''} onChange={(e) => setField('reintegrationStatus', e.target.value || null)} placeholder="Reintegration status" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input type="date" value={formData.dateOfBirth ?? ''} onChange={(e) => setField('dateOfBirth', e.target.value || null)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <input type="date" value={formData.dateOfAdmission ?? ''} onChange={(e) => setField('dateOfAdmission', e.target.value || null)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-700 md:grid-cols-4">
              {[
                ['subCatTrafficked', 'Trafficked'],
                ['subCatPhysicalAbuse', 'Physical abuse'],
                ['subCatChildLabor', 'Child labor'],
                ['subCatAtRisk', 'At risk'],
                ['familyIs4ps', '4Ps'],
                ['familySoloParent', 'Solo parent'],
                ['familyIndigenous', 'Indigenous'],
                ['familyInformalSettler', 'Informal settler'],
                ['isPwd', 'PWD'],
                ['hasSpecialNeeds', 'Special needs'],
              ].map(([field, label]) => (
                <label key={field} className="flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={Boolean(formData[field as keyof Resident])}
                    onChange={(e) => setField(field as keyof Resident, e.target.checked as never)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <textarea
              value={formData.notesRestricted ?? ''}
              onChange={(e) => setField('notesRestricted', e.target.value || null)}
              placeholder="Case notes"
              className="mt-4 min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setEditing(null); setCreating(false) }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveResident}
                disabled={saving}
                className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : editing ? 'Update resident' : 'Create resident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
