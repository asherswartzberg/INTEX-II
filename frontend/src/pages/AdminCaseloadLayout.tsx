import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Outlet, useNavigate, useOutletContext, useSearchParams } from 'react-router'
import { fetchResidents } from '../apis/residentsApi'
import { fetchResidentRiskScores } from '../apis/residentRiskScoresApi'
import type { Resident } from '../types/Resident'
import type { ResidentRiskScore } from '../types/ResidentRiskScore'
import { useAuth } from '../context/AuthContext'

export interface CaseloadContext {
  selected: Resident | null
  setSelected: (r: Resident | null) => void
  residents: Resident[]
  isAdmin: boolean
  riskScoreMap: Map<number, ResidentRiskScore>
  refreshResidents: () => Promise<void>
  /** Information tab registers this so "+ New Resident" can open the create modal; cleared on unmount. */
  registerNewResidentHandler: (fn: (() => void) | null) => void
}

export function useCaseloadContext() {
  return useOutletContext<CaseloadContext>()
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

const PAGE_SIZE = 15

export default function AdminCaseloadLayout() {
  const { authSession } = useAuth()
  const isAdmin = authSession.roles.includes('Admin')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const newResidentHandlerRef = React.useRef<(() => void) | null>(null)
  const registerNewResidentHandler = useCallback((fn: (() => void) | null) => {
    newResidentHandlerRef.current = fn
  }, [])
  const [residents, setResidents] = useState<Resident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [safehouseFilter, setSafehouseFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Resident | null>(null)
  const [riskScores, setRiskScores] = useState<ResidentRiskScore[]>([])
  const [sortByRisk, setSortByRisk] = useState(() => searchParams.get('sort') === 'predictedRisk')

  useEffect(() => {
    fetchResidentRiskScores().then(setRiskScores).catch(console.error)
  }, [])

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
    () => Array.from(new Set(residents.map((r) => r.safehouseId).filter((v): v is number => v != null))).sort((a, b) => a - b),
    [residents],
  )
  const categoryOptions = useMemo(
    () => Array.from(new Set(residents.map((r) => r.caseCategory).filter((v): v is string => !!v))).sort(),
    [residents],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const ctx: CaseloadContext = {
    selected,
    setSelected,
    residents,
    isAdmin,
    riskScoreMap,
    refreshResidents,
    registerNewResidentHandler,
  }

  return (
    <div className="flex h-full gap-3 overflow-hidden p-3 bg-off-white dark:bg-[#111]">
      {/* Resident table panel */}
      <div className={`flex flex-col rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:ring-white/5 w-full md:w-[480px] md:shrink-0 ${selected ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b border-border bg-white px-6 py-4 dark:border-[#333] dark:bg-[#1a1a1a]">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Caseload Inventory</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Core resident case management records</p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (newResidentHandlerRef.current) newResidentHandlerRef.current()
                  else navigate('/admin/caseload/information', { state: { openCreate: true } })
                }}
                className="shrink-0 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                + New Resident
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
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
          </div>
        </div>

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
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">CODE</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">SAFEHOUSE</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">STATUS</th>
                  <th scope="col" className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={() => { setSortByRisk(prev => !prev); setPage(1) }}>PREDICTED RISK{sortByRisk ? ' ↓' : ''}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#2a2a2a]">
                {paged.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No residents found.</td></tr>
                ) : (
                  paged.map((r) => {
                    const rs = riskScoreMap.get(r.residentId)
                    const riskLabel = rs?.riskLabel
                    return (
                      <tr
                        key={r.residentId}
                        onClick={() => setSelected(r)}
                        className={`cursor-pointer transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/40 ${selected?.residentId === r.residentId ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
                      >
                        <td className={`w-[3px] p-0 transition-colors ${selected?.residentId === r.residentId ? 'bg-blue-600' : 'bg-transparent'}`} />
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{r.internalCode ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">SH-{r.safehouseId ?? '?'}</td>
                        <td className="px-4 py-3">
                          <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.caseStatus ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                            {r.caseStatus ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {riskLabel ? (
                            <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${PREDICTED_RISK_STYLE[riskLabel] ?? 'bg-gray-100 text-gray-500'}`}>
                              {riskLabel}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

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

      {/* Detail panel via nested route */}
      <div className={`w-full min-w-0 flex-1 overflow-y-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:ring-white/5 ${!selected ? 'hidden md:block' : ''}`}>
        {/* Mobile back button */}
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="mx-5 mt-4 mb-1 flex items-center gap-1.5 text-sm text-medium-gray hover:text-black md:hidden"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to list
          </button>
        )}
        <Outlet context={ctx} />
      </div>
    </div>
  )
}
