import { useEffect, useState, useCallback, useMemo } from 'react'
import { createResident, deleteResident, fetchResidents, updateResident } from '../apis/residentsApi'
import type { Resident } from '../types/Resident'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAuth } from '../context/AuthContext'

const RISK_STYLE: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
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
      if (selected) {
        const updatedSelected = rows.find((r) => r.residentId === selected.residentId) ?? null
        setSelected(updatedSelected)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load residents')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, safehouseFilter, search, selected, statusFilter])

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

  const filtered = residents

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

  return (
    <div className="flex h-full bg-gradient-to-br from-[#fffaf0] via-white to-[#f7f8fa]">
      {/* ── List panel ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="border-b border-[#f0e7d8] bg-white/85 px-6 py-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Caseload Inventory</h1>
              <p className="text-xs text-gray-500">Core resident case management records</p>
            </div>
            {isAdmin && (
              <button
                onClick={openCreate}
                className="rounded-full bg-[#111827] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
              >
                + New Resident
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search case no, code, referral..."
                className="w-64 rounded-full border border-[#e7ddcc] bg-[#fffbf3] py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-[#c59b4f] focus:outline-none"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="rounded-full border border-[#e7ddcc] bg-[#fffbf3] px-3 py-2 text-sm text-gray-600 focus:border-[#c59b4f] focus:outline-none"
            >
              <option value="">All statuses</option>
              {['Active', 'Closed', 'Transferred'].map((s) => <option key={s}>{s}</option>)}
            </select>

            <select
              value={safehouseFilter}
              onChange={(e) => { setSafehouseFilter(e.target.value); setPage(1) }}
              className="rounded-full border border-[#e7ddcc] bg-[#fffbf3] px-3 py-2 text-sm text-gray-600 focus:border-[#c59b4f] focus:outline-none"
            >
              <option value="">All safehouses</option>
              {safehouseOptions.map((s) => <option key={s} value={s}>SH-{s}</option>)}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="rounded-full border border-[#e7ddcc] bg-[#fffbf3] px-3 py-2 text-sm text-gray-600 focus:border-[#c59b4f] focus:outline-none"
            >
              <option value="">All categories</option>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <span className="ml-auto text-xs text-gray-400">{filtered.length} records</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="space-y-2 p-6">
              {[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100">
                  {['CASE NO', 'CODE', 'SAFEHOUSE', 'STATUS', 'RISK LEVEL', 'CATEGORY', 'ADMITTED', 'SOCIAL WORKER'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No residents found.</td></tr>
                ) : (
                  paged.map((r) => (
                    <tr
                      key={r.residentId}
                      onClick={() => setSelected(r)}
                      className={`cursor-pointer hover:bg-blue-50 ${selected?.residentId === r.residentId ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.caseControlNo ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{r.internalCode ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">SH-{r.safehouseId ?? '?'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.caseStatus ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                          {r.caseStatus ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_STYLE[r.currentRiskLevel ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                          {r.currentRiskLevel ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{r.caseCategory ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(r.dateOfAdmission)}</td>
                      <td className="px-4 py-3 text-gray-500">{r.assignedSocialWorker ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-3">
          <span className="text-xs text-gray-400">
            {filtered.length === 0 ? '0' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)}`} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40">Prev</button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pg = i + 1
              return (
                <button key={pg} onClick={() => setPage(pg)} className={`rounded px-3 py-1 text-xs ${page === pg ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{pg}</button>
              )
            })}
            {totalPages > 5 && <span className="px-1 text-xs text-gray-400">…</span>}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div className="w-[360px] shrink-0 overflow-y-auto border-l border-gray-100 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">{selected.internalCode}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmDelete(selected)}
                disabled={!isAdmin}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
              <button
                onClick={() => openEdit(selected)}
                disabled={!isAdmin}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Badges */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[selected.caseStatus ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>{selected.caseStatus ?? '—'}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_STYLE[selected.currentRiskLevel ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>{selected.currentRiskLevel ?? '—'} Risk</span>
          </div>

          <dl className="space-y-3 text-sm">
            {[
              ['Case Control No', selected.caseControlNo],
              ['Age', calcAge(selected.dateOfBirth)],
              ['Safehouse', `SH-${selected.safehouseId ?? '?'}`],
              ['Case Category', selected.caseCategory],
              ['Reintegration Status', selected.reintegrationStatus],
              ['Date of Admission', fmtDate(selected.dateOfAdmission)],
              ['Social Worker', selected.assignedSocialWorker],
              ['Referral Source', selected.referralSource],
              ['Reintegration Type', selected.reintegrationType],
            ].map(([label, value]) => value && (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-gray-400 shrink-0">{label}</dt>
                <dd className="text-right font-medium text-gray-700">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Sub-categories */}
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

          {/* PWD / Special needs */}
          {(selected.isPwd || selected.hasSpecialNeeds) && (
            <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700">Special Needs</p>
              {selected.isPwd && <p className="mt-1 text-xs text-amber-600">PWD: {selected.pwdType ?? 'Yes'}</p>}
              {selected.hasSpecialNeeds && <p className="text-xs text-amber-600">Diagnosis: {selected.specialNeedsDiagnosis ?? 'Noted'}</p>}
            </div>
          )}
        </div>
      )}

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
