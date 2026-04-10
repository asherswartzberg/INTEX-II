import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { fetchSupporters, createSupporter, updateSupporter, deleteSupporter, fetchDonationsForSupporter } from '../apis/supportersApi'
import { fetchDonationAllocations, createDonationAllocation, updateDonationAllocation } from '../apis/donationAllocationsApi'
import { fetchDonorRiskScores } from '../apis/donorRiskScoresApi'
import type { Supporter } from '../types/Supporter'
import type { Donation } from '../types/Donation'
import type { DonationAllocation } from '../types/DonationAllocation'
import type { DonorRiskScore } from '../types/DonorRiskScore'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../apis/client'

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string | null) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-amber-500', 'bg-rose-500', 'bg-green-500',
  'bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500',
]

function avatarColor(name: string | null) {
  if (!name) return AVATAR_COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function fmtCurrency(n: number | null, _code?: string | null) {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en', { maximumFractionDigits: 0 })
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', d: 'numeric', year: 'numeric' } as Intl.DateTimeFormatOptions)
}

function sinceYear(s: string | null) {
  if (!s) return null
  return 'Since ' + new Date(s).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const ALLOC_COLORS: Record<string, string> = {
  Education: '#3b82f6',
  Wellbeing: '#22c55e',
  Operations: '#b45309',
  Transport: '#7c3aed',
  Outreach: '#ef4444',
  Healthcare: '#06b6d4',
  Food: '#f59e0b',
  Other: '#6b7280',
}

function allocColor(area: string | null) {
  if (!area) return '#6b7280'
  return ALLOC_COLORS[area] ?? '#6b7280'
}

function formatSupporterSaveError(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = err.body?.trim()
    return detail ? `${err.message}: ${detail.slice(0, 500)}` : err.message
  }
  return err instanceof Error ? err.message : 'Save failed'
}

/** Distinct values from lighthouse supporters.csv */
const SUPPORTER_RELATIONSHIP_TYPES = ['International', 'Local', 'PartnerOrganization'] as const

const SUPPORTER_ACQUISITION_CHANNELS = [
  'Church',
  'Event',
  'PartnerReferral',
  'SocialMedia',
  'Website',
  'WordOfMouth',
] as const

function blankSupporter(): Supporter {
  return {
    supporterId: 0,
    supporterType: 'MonetaryDonor',
    displayName: null,
    organizationName: null,
    firstName: null,
    lastName: null,
    relationshipType: 'Local',
    region: null,
    country: 'Chile',
    email: null,
    phone: null,
    status: 'Active',
    createdAt: null,
    firstDonationDate: null,
    acquisitionChannel: 'Website',
  }
}

const REQUIRED_SUPPORTER_FIELDS: { key: keyof Supporter; label: string }[] = [
  { key: 'displayName', label: 'Display Name' },
  { key: 'supporterType', label: 'Supporter Type' },
  { key: 'relationshipType', label: 'Relationship Type' },
  { key: 'region', label: 'Region' },
  { key: 'country', label: 'Country' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'acquisitionChannel', label: 'Acquisition Channel' },
]

// ── Component ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 8

export default function AdminDonors() {
  const { authSession } = useAuth()
  const isAdmin = authSession.roles.includes('Admin')
  const [searchParams, setSearchParams] = useSearchParams()
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'name' | 'churnRisk'>(() => searchParams.get('sort') === 'churnRisk' ? 'churnRisk' : 'name')

  const [riskScores, setRiskScores] = useState<DonorRiskScore[]>([])

  const [selected, setSelected] = useState<Supporter | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [allocations, setAllocations] = useState<DonationAllocation[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [donationPage, setDonationPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<Supporter | null>(null)
  const [editing, setEditing] = useState<Supporter | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<Supporter>(blankSupporter())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    try {
      await deleteSupporter(confirmDelete.supporterId)
      setSupporters((prev) => prev.filter((s) => s.supporterId !== confirmDelete.supporterId))
      if (selected?.supporterId === confirmDelete.supporterId) setSelected(null)
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setConfirmDelete(null)
    }
  }, [confirmDelete, selected])

  const openCreate = useCallback(() => {
    setFormData(blankSupporter())
    setSaveError(null)
    setCreating(true)
    setEditing(null)
  }, [])

  const openEdit = useCallback((s: Supporter) => {
    setFormData({ ...s })
    setSaveError(null)
    setEditing(s)
    setCreating(false)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const missing = REQUIRED_SUPPORTER_FIELDS.filter(({ key }) => {
        const value = formData[key]
        if (typeof value === 'string') return value.trim().length === 0
        return value === null || value === undefined
      }).map(({ label }) => label)
      if (missing.length > 0) {
        setSaveError(`Please complete required fields: ${missing.join(', ')}`)
        return
      }
      if (editing) {
        await updateSupporter(formData.supporterId, formData)
        setSupporters(prev => prev.map(s => s.supporterId === formData.supporterId ? formData : s))
        if (selected?.supporterId === formData.supporterId) setSelected(formData)
        setEditing(null)
      } else {
        const created = await createSupporter(formData)
        setSupporters(prev => [...prev, created])
        setCreating(false)
      }
    } catch (err) {
      console.error('Save failed', err)
      setSaveError(formatSupporterSaveError(err))
    } finally {
      setSaving(false)
    }
  }, [editing, formData, selected])

  // Load supporter list
  useEffect(() => {
    setLoadingList(true)
    fetchSupporters({ pageSize: 200 })
      .then(setSupporters)
      .catch(console.error)
      .finally(() => setLoadingList(false))
  }, [])

  // Load donor churn risk scores
  useEffect(() => {
    fetchDonorRiskScores().then(setRiskScores).catch(console.error)
  }, [])

  // Auto-select donor from URL query param
  const autoSelectDonorRef = React.useRef(searchParams.get('donor'))
  useEffect(() => {
    const did = autoSelectDonorRef.current
    if (did && supporters.length > 0) {
      const found = supporters.find(s => s.supporterId === Number(did))
      if (found) {
        setSelected(found)
        autoSelectDonorRef.current = null
        setSearchParams(prev => { prev.delete('donor'); return prev }, { replace: true })
      }
    }
  }, [supporters, setSearchParams])

  // Load detail when supporter selected
  useEffect(() => {
    if (!selected) return
    setLoadingDetail(true)
    setDonations([])
    setAllocations([])
    setDonationPage(1)
    fetchDonationsForSupporter(selected.supporterId)
      .then(async (ds) => {
        setDonations(ds)
        // Fetch allocations for all donations in parallel
        const allAllocs = await Promise.all(
          ds.map((d) => fetchDonationAllocations({ donationId: d.donationId }).catch(() => []))
        )
        setAllocations(allAllocs.flat())
      })
      .catch(console.error)
      .finally(() => setLoadingDetail(false))
  }, [selected])

  // O(1) risk score lookups
  const riskMap = useMemo(() => {
    const m = new Map<number, DonorRiskScore>()
    riskScores.forEach((r) => m.set(r.supporterId, r))
    return m
  }, [riskScores])

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = supporters
    if (typeFilter !== 'All') list = list.filter((s) => s.supporterType === typeFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.displayName?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.organizationName?.toLowerCase().includes(q)
      )
    }
    list = [...list]
    if (sortBy === 'churnRisk') {
      list.sort((a, b) => {
        const ra = riskMap.get(a.supporterId)?.churnRiskScore ?? -1
        const rb = riskMap.get(b.supporterId)?.churnRiskScore ?? -1
        return rb - ra
      })
    } else {
      list.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
    }
    return list
  }, [supporters, typeFilter, search, sortBy, riskMap])

  // Derived donor detail metrics
  const lifetimeTotal = donations
    .filter((d) => d.donationType === 'Monetary')
    .reduce((s, d) => s + (d.amount ?? 0), 0)

  const avgDonation = donations.filter((d) => d.donationType === 'Monetary').length
    ? lifetimeTotal / donations.filter((d) => d.donationType === 'Monetary').length
    : 0

  // Allocation percentages by program area
  const allocByArea = useMemo(() => {
    const totals: Record<string, number> = {}
    allocations.forEach((a) => {
      const area = a.programArea ?? 'Other'
      totals[area] = (totals[area] ?? 0) + (a.amountAllocated ?? 0)
    })
    const grand = Object.values(totals).reduce((s, v) => s + v, 0)
    if (!grand) return []
    return Object.entries(totals)
      .map(([area, amt]) => ({ area, pct: Math.round((amt / grand) * 100) }))
      .sort((a, b) => b.pct - a.pct)
  }, [allocations])

  // Paginated donations
  const totalDonationPages = Math.max(1, Math.ceil(donations.length / PAGE_SIZE))
  const pagedDonations = donations.slice((donationPage - 1) * PAGE_SIZE, donationPage * PAGE_SIZE)

  const filterOptions = useMemo(() => {
    const types = [...new Set(supporters.map((s) => s.supporterType).filter(Boolean))] as string[]
    types.sort()
    return ['All', ...types]
  }, [supporters])

  return (
    <div className="flex h-full">
      {/* ── Supporter list panel — hidden on mobile when a donor is selected ── */}
      <div className={`flex w-full flex-col border-r border-gray-100 bg-white md:w-[300px] md:shrink-0 ${selected ? 'hidden md:flex' : 'flex'}`}>
        {/* Search */}
        <div className="p-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supporters..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="shrink-0 rounded-lg bg-[#111827] px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
              >
                + New
              </button>
            )}
          </div>
          <div className="mt-3">
            <label htmlFor="donor-type-filter" className="mb-1 block text-xs font-medium text-gray-500">
              Supporter type
            </label>
            <select
              id="donor-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {filterOptions.map((f) => (
                <option key={f} value={f}>
                  {f === 'All' ? 'All types' : f}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-500">Sort by</label>
            <div className="flex gap-1.5">
              {([['name', 'Name'], ['churnRisk', 'Churn Risk']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSortBy(val)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    sortBy === val
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="space-y-2 p-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">No supporters found.</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.supporterId}
                onClick={() => setSelected(s)}
                className={`flex w-full items-center gap-3 border-l-2 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 ${
                  selected?.supporterId === s.supporterId
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-transparent'
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(s.displayName)}`}>
                  {initials(s.displayName)}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-gray-800">
                    {(() => {
                      const risk = riskMap.get(s.supporterId)
                      if (!risk?.riskLabel) return null
                      const dotColor =
                        risk.riskLabel === 'Low Risk'
                          ? 'bg-green-500'
                          : risk.riskLabel === 'Moderate Risk'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotColor}`} title={risk.riskLabel} />
                    })()}
                    <span className="truncate">{s.displayName ?? '—'}</span>
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {s.supporterType ?? '—'} · {s.status ?? 'Unknown'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div className={`flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 ${!selected ? 'hidden md:block' : ''}`}>
        {!selected ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Select a supporter to view details.</p>
          </div>
        ) : (
          <>
          {/* Mobile back button */}
          <button
            onClick={() => setSelected(null)}
            className="mb-4 flex items-center gap-1.5 text-sm text-medium-gray hover:text-black md:hidden"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to list
          </button>
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white ${avatarColor(selected.displayName)}`}>
                  {initials(selected.displayName)}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{selected.displayName}</h1>
                  <p className="text-sm text-gray-500">
                    {selected.supporterType ?? '—'} · {selected.relationshipType ?? selected.region ?? '—'}
                    {selected.firstDonationDate ? ` · ${sinceYear(selected.firstDonationDate)}` : ''}
                  </p>
                  <p className="text-sm text-gray-400">
                    {selected.email && <span>{selected.email}</span>}
                    {selected.email && selected.phone && <span> · </span>}
                    {selected.phone && <span>{selected.phone}</span>}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(selected)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(selected)}
                    className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Churn Risk Assessment */}
            {(() => {
              const selectedRisk = riskScores.find((r) => r.supporterId === selected?.supporterId)
              if (!selectedRisk) {
                return (
                  <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5">
                    <h2 className="mb-2 text-sm font-semibold text-gray-800">Churn Risk Assessment</h2>
                    <p className="text-sm text-gray-400">No prediction data available</p>
                  </div>
                )
              }
              const badgeColor =
                selectedRisk.riskLabel === 'Low Risk'
                  ? 'bg-green-100 text-green-700'
                  : selectedRisk.riskLabel === 'Moderate Risk'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              return (
                <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5">
                  <h2 className="mb-3 text-sm font-semibold text-gray-800">Churn Risk Assessment</h2>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
                      {selectedRisk.riskLabel}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {selectedRisk.churnRiskScore != null
                        ? `${Math.round(selectedRisk.churnRiskScore * 100)}% churn likelihood`
                        : '—'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Last donation {selectedRisk.recencyDays ?? '—'} days ago · {selectedRisk.frequency ?? 0} total donations
                  </p>
                  {selectedRisk.topFactors && (
                    <p className="mt-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">Top factors:</span> {selectedRisk.topFactors}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">Predictions generated by ML models · Updated nightly</p>
                </div>
              )
            })()}

            {/* Metric cards */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
                <p className="mb-1 text-xs font-semibold tracking-widest text-gray-400">LIFETIME TOTAL</p>
                <p className="text-2xl font-bold text-gray-900">{fmtCurrency(lifetimeTotal)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
                <p className="mb-1 text-xs font-semibold tracking-widest text-gray-400">DONATIONS COUNT</p>
                <p className="text-2xl font-bold text-gray-900">{donations.length}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
                <p className="mb-1 text-xs font-semibold tracking-widest text-gray-400">AVG DONATION</p>
                <p className="text-2xl font-bold text-gray-900">{fmtCurrency(avgDonation || null)}</p>
              </div>
            </div>

            {/* Allocation bar */}
            {allocByArea.length > 0 && (
              <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-gray-800">Allocation by program area</h2>
                {/* Stacked bar */}
                <div className="flex h-3 w-full overflow-hidden rounded-full">
                  {allocByArea.map((a) => (
                    <div
                      key={a.area}
                      style={{ width: `${a.pct}%`, backgroundColor: allocColor(a.area) }}
                      title={`${a.area}: ${a.pct}%`}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                  {allocByArea.map((a) => (
                    <span key={a.area} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: allocColor(a.area) }} />
                      {a.area} {a.pct}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Donation history */}
            <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
              <div className="border-b border-gray-50 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-800">Donation history</h2>
              </div>
              <div className="overflow-x-auto">
              {loadingDetail ? (
                <div className="space-y-2 p-5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              ) : donations.length === 0 ? (
                <p className="p-6 text-sm text-gray-400">No donations recorded.</p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50">
                        {['DATE', 'AMOUNT', 'TYPE', 'CAMPAIGN', 'ALLOCATION'].map((h) => (
                          <th key={h} scope="col" className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pagedDonations.map((d) => {
                        const alloc = allocations.find((a) => a.donationId === d.donationId)
                        return (
                          <tr key={d.donationId} className="hover:bg-gray-50">
                            <td className="px-5 py-3 text-gray-700">{fmtDate(d.donationDate)}</td>
                            <td className="px-5 py-3 font-semibold text-gray-900">
                              {fmtCurrency(d.amount ?? d.estimatedValue, d.currencyCode)}
                            </td>
                            <td className="px-5 py-3 text-gray-600">{d.donationType ?? '—'}</td>
                            <td className="px-5 py-3 text-gray-600">{d.campaignName ?? '—'}</td>
                            <td className="px-5 py-3 text-gray-500">
                              <select
                                value={alloc?.programArea ?? ''}
                                onChange={async (e) => {
                                  const area = e.target.value
                                  if (!area) return
                                  try {
                                    if (alloc) {
                                      await updateDonationAllocation(alloc.allocationId, { ...alloc, programArea: area })
                                      setAllocations(prev => prev.map(a => a.allocationId === alloc.allocationId ? { ...a, programArea: area } : a))
                                    } else {
                                      const newAlloc = await createDonationAllocation({
                                        allocationId: 0,
                                        donationId: d.donationId,
                                        safehouseId: null,
                                        programArea: area,
                                        amountAllocated: d.amount ?? d.estimatedValue ?? 0,
                                        allocationDate: d.donationDate ?? null,
                                        allocationNotes: null,
                                      })
                                      setAllocations(prev => [...prev, newAlloc])
                                    }
                                  } catch { /* ignore */ }
                                }}
                                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 focus:border-blue-400 focus:outline-none"
                              >
                                <option value="">Allocate...</option>
                                {['Education', 'Wellbeing', 'Operations', 'Transport', 'Maintenance', 'Outreach'].map(a => (
                                  <option key={a} value={a}>{a}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t border-gray-50 px-5 py-3">
                    <span className="text-xs text-gray-400">
                      Showing {(donationPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(donationPage * PAGE_SIZE, donations.length)} of {donations.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDonationPage((p) => Math.max(1, p - 1))}
                        disabled={donationPage === 1}
                        className="rounded px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      {[...Array(totalDonationPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setDonationPage(i + 1)}
                          className={`rounded px-2.5 py-1 text-xs font-medium ${
                            donationPage === i + 1
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setDonationPage((p) => Math.min(totalDonationPages, p + 1))}
                        disabled={donationPage === totalDonationPages}
                        className="rounded px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete supporter"
        message={`Are you sure you want to delete ${confirmDelete?.displayName ?? confirmDelete?.organizationName ?? 'this supporter'}? This will also remove any linked user account. This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Create / Edit Supporter Modal */}
      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-[#1a1a1a]">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              {editing ? 'Edit Supporter' : 'New Supporter'}
            </h2>

            {saveError && (
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">{saveError}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">First Name</label>
                <input type="text" value={formData.firstName ?? ''} onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Last Name</label>
                <input type="text" value={formData.lastName ?? ''} onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Display Name *</label>
                <input type="text" value={formData.displayName ?? ''} onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Organization Name</label>
                <input type="text" value={formData.organizationName ?? ''} onChange={e => setFormData(prev => ({ ...prev, organizationName: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Supporter Type *</label>
                <select value={formData.supporterType ?? ''} onChange={e => setFormData(prev => ({ ...prev, supporterType: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100">
                  <option value="">Select...</option>
                  {['MonetaryDonor', 'InKindDonor', 'Partner', 'Volunteer', 'Corporate', 'Foundation'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Status *</label>
                <select value={formData.status ?? ''} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Email *</label>
                <input type="email" value={formData.email ?? ''} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Phone *</label>
                <input type="text" value={formData.phone ?? ''} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Region *</label>
                <input type="text" value={formData.region ?? ''} onChange={e => setFormData(prev => ({ ...prev, region: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Country *</label>
                <input type="text" value={formData.country ?? ''} onChange={e => setFormData(prev => ({ ...prev, country: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Relationship Type *</label>
                <select value={formData.relationshipType ?? ''} onChange={e => setFormData(prev => ({ ...prev, relationshipType: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100">
                  <option value="">Select…</option>
                  {SUPPORTER_RELATIONSHIP_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Acquisition Channel *</label>
                <select value={formData.acquisitionChannel ?? ''} onChange={e => setFormData(prev => ({ ...prev, acquisitionChannel: e.target.value || null }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100">
                  <option value="">Select…</option>
                  {SUPPORTER_ACQUISITION_CHANNELS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => { setSaveError(null); setCreating(false); setEditing(null) }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#222]">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Supporter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
