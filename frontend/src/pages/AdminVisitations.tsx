import { useEffect, useState, useCallback } from 'react'
import {
  fetchHomeVisitationsForResident,
  createHomeVisitation,
  updateHomeVisitation,
  deleteHomeVisitation,
} from '../apis/homeVisitationsApi'
import type { HomeVisitation } from '../types/HomeVisitation'
import ConfirmDialog from '../components/ConfirmDialog'
import { useCaseloadContext } from './AdminCaseloadLayout'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const VISIT_TYPE_OPTIONS = [
  'Initial Assessment',
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
  'Emergency',
]
const COOP_OPTIONS = ['Highly Cooperative', 'Cooperative', 'Neutral', 'Uncooperative']
const OUTCOME_OPTIONS = ['Favorable', 'Needs Improvement', 'Unfavorable', 'Inconclusive']

const COOP_COLOR: Record<string, string> = {
  'Highly Cooperative': 'text-green-700 bg-green-50',
  Cooperative: 'text-green-600 bg-green-50',
  Neutral: 'text-yellow-700 bg-yellow-50',
  Uncooperative: 'text-red-700 bg-red-50',
}

function blankVisitation(residentId: number): HomeVisitation {
  return {
    visitationId: 0, residentId,
    visitDate: new Date().toISOString().slice(0, 10),
    socialWorker: '', visitType: null, locationVisited: '',
    familyMembersPresent: '', purpose: '', observations: '',
    familyCooperationLevel: null, safetyConcernsNoted: false,
    followUpNeeded: false, followUpNotes: null, visitOutcome: null,
  }
}

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none dark:border-[#444] dark:bg-[#111] dark:text-gray-100'
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1'

export default function AdminVisitations() {
  const { selected } = useCaseloadContext()

  const [visitations, setVisitations] = useState<HomeVisitation[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loadingVisitations, setLoadingVisitations] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<HomeVisitation | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<HomeVisitation | null>(null)
  const [formData, setFormData] = useState<HomeVisitation>(blankVisitation(0))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const refreshVisitations = useCallback(async (residentId: number) => {
    setLoadingVisitations(true)
    try {
      const vs = await fetchHomeVisitationsForResident(residentId)
      setVisitations(vs.sort((a, b) => (b.visitDate ?? '').localeCompare(a.visitDate ?? '')))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingVisitations(false)
    }
  }, [])

  const openCreate = () => {
    if (!selected) return
    setEditing(null)
    setFormData(blankVisitation(selected.residentId))
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (v: HomeVisitation) => {
    setEditing(v)
    setFormData({ ...v })
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setFormError(null)
  }

  const handleSave = async () => {
    if (!selected) return
    if (!formData.visitDate) {
      setFormError('Visit date is required.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await updateHomeVisitation(editing.visitationId, {
          ...formData,
          visitationId: editing.visitationId,
          residentId: selected.residentId,
        })
      } else {
        await createHomeVisitation({
          ...formData,
          visitationId: 0,
          residentId: selected.residentId,
        })
      }
      closeForm()
      await refreshVisitations(selected.residentId)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = useCallback(async () => {
    if (!confirmDelete || !selected) return
    try {
      await deleteHomeVisitation(confirmDelete.visitationId)
      setVisitations((prev) => prev.filter((v) => v.visitationId !== confirmDelete.visitationId))
      if (expanded === confirmDelete.visitationId) setExpanded(null)
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setConfirmDelete(null)
    }
  }, [confirmDelete, expanded, selected])

  useEffect(() => {
    if (!selected) {
      setVisitations([])
      setExpanded(null)
      closeForm()
      return
    }
    setVisitations([])
    setExpanded(null)
    closeForm()
    refreshVisitations(selected.residentId)
  }, [selected?.residentId, refreshVisitations])

  const setField = <K extends keyof HomeVisitation>(key: K, value: HomeVisitation[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }))

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-gray-400">Select a resident to view their home visitations.</p>
      </div>
    )
  }

  if (formOpen) {
    return (
      <div className="overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {editing ? 'Edit Visitation' : 'New Home Visitation'}
            </h1>
            <button onClick={closeForm} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#222]">Cancel</button>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Resident: <span className="font-medium text-gray-700 dark:text-gray-300">{selected.internalCode}</span>
          </p>
          {formError && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{formError}</div>}
          <div className="space-y-5 rounded-xl border border-gray-100 bg-white p-6 dark:bg-[#1a1a1a] dark:border-[#333]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Visit Date *</label>
                <input type="date" value={formData.visitDate ?? ''} onChange={(e) => setField('visitDate', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Visit Type</label>
                <select value={formData.visitType ?? ''} onChange={(e) => setField('visitType', e.target.value || null)} className={inputCls}>
                  <option value="">Select...</option>
                  {VISIT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Social Worker</label>
                <input type="text" value={formData.socialWorker ?? ''} onChange={(e) => setField('socialWorker', e.target.value)} placeholder="Name of social worker" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Location Visited</label>
                <input type="text" value={formData.locationVisited ?? ''} onChange={(e) => setField('locationVisited', e.target.value)} placeholder="Address or location" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Family Members Present</label>
              <input type="text" value={formData.familyMembersPresent ?? ''} onChange={(e) => setField('familyMembersPresent', e.target.value)} placeholder='e.g. "Mother and aunt"' className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Purpose</label>
              <textarea rows={2} value={formData.purpose ?? ''} onChange={(e) => setField('purpose', e.target.value)} placeholder="Purpose of the visit" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Observations</label>
              <textarea rows={4} value={formData.observations ?? ''} onChange={(e) => setField('observations', e.target.value)} placeholder="Narrative observations about the home environment and family" className={inputCls} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Family Cooperation Level</label>
                <select value={formData.familyCooperationLevel ?? ''} onChange={(e) => setField('familyCooperationLevel', e.target.value || null)} className={inputCls}>
                  <option value="">Select...</option>
                  {COOP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Visit Outcome</label>
                <select value={formData.visitOutcome ?? ''} onChange={(e) => setField('visitOutcome', e.target.value || null)} className={inputCls}>
                  <option value="">Select...</option>
                  {OUTCOME_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.safetyConcernsNoted ?? false} onChange={(e) => setField('safetyConcernsNoted', e.target.checked)} className="h-4 w-4 rounded border-gray-300" /> Safety concerns noted
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.followUpNeeded ?? false} onChange={(e) => setField('followUpNeeded', e.target.checked)} className="h-4 w-4 rounded border-gray-300" /> Follow-up needed
              </label>
            </div>
            {formData.followUpNeeded && (
              <div>
                <label className={labelCls}>Follow-Up Notes</label>
                <textarea rows={2} value={formData.followUpNotes ?? ''} onChange={(e) => setField('followUpNotes', e.target.value)} placeholder="Details of required follow-up" className={inputCls} />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeForm} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#222]">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200">
                {saving ? 'Saving...' : editing ? 'Update Visitation' : 'Create Visitation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {selected.internalCode} — Home Visitations
            </h1>
            <p className="text-sm text-gray-400">
              {visitations.length} visit{visitations.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
          <button onClick={openCreate} className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200">
            + New Visitation
          </button>
        </div>

        {loadingVisitations ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-[#222]" />)}
          </div>
        ) : visitations.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-400 dark:bg-[#222]">
            No visitations recorded for this resident.
          </div>
        ) : (
          <div className="space-y-3">
            {visitations.map((v) => {
              const isOpen = expanded === v.visitationId
              const coopCls = COOP_COLOR[v.familyCooperationLevel ?? ''] ?? 'text-gray-600 bg-gray-100'
              return (
                <div key={v.visitationId} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:bg-[#222] dark:border-[#333]">
                  <button onClick={() => setExpanded(isOpen ? null : v.visitationId)} className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-[#2a2a2a] md:px-5 md:py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtDate(v.visitDate)}</span>
                        <span className="ml-2 text-xs text-gray-400">{v.visitType ?? '—'}</span>
                        <p className="mt-0.5 text-xs text-gray-500">{v.socialWorker ?? 'Unknown'} · {v.locationVisited ?? '—'}</p>
                      </div>
                      <svg className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {v.familyCooperationLevel && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${coopCls}`}>{v.familyCooperationLevel}</span>}
                      {v.safetyConcernsNoted && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Safety concern</span>}
                      {v.followUpNeeded && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Follow-up needed</span>}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="space-y-4 border-t border-gray-100 px-5 py-4 dark:border-[#333]">
                      {v.purpose && <div><p className="mb-1 text-xs font-semibold text-gray-400">PURPOSE</p><p className="text-sm text-gray-700 dark:text-gray-300">{v.purpose}</p></div>}
                      {v.familyMembersPresent && <div><p className="mb-1 text-xs font-semibold text-gray-400">FAMILY MEMBERS PRESENT</p><p className="text-sm text-gray-700 dark:text-gray-300">{v.familyMembersPresent}</p></div>}
                      {v.observations && <div><p className="mb-1 text-xs font-semibold text-gray-400">OBSERVATIONS</p><p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{v.observations}</p></div>}
                      {v.visitOutcome && <div><p className="mb-1 text-xs font-semibold text-gray-400">OUTCOME</p><p className="text-sm text-gray-700 dark:text-gray-300">{v.visitOutcome}</p></div>}
                      {v.followUpNeeded && v.followUpNotes && (
                        <div className="rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">FOLLOW-UP NOTES</p>
                          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{v.followUpNotes}</p>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => openEdit(v)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:bg-transparent dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#333]">Edit</button>
                        <button onClick={() => setConfirmDelete(v)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:bg-transparent dark:border-red-800 dark:hover:bg-red-950">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete visitation"
        message={`Are you sure you want to delete the visitation from ${confirmDelete?.visitDate ? new Date(confirmDelete.visitDate).toLocaleDateString() : 'this date'}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}
