import { useEffect, useState, useCallback } from 'react'
import { fetchResidents } from '../apis/residentsApi'
import { fetchHomeVisitationsForResident, deleteHomeVisitation } from '../apis/homeVisitationsApi'
import type { Resident } from '../types/Resident'
import type { HomeVisitation } from '../types/HomeVisitation'
import ConfirmDialog from '../components/ConfirmDialog'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const COOP_COLOR: Record<string, string> = {
  High: 'text-green-700 bg-green-50',
  Medium: 'text-yellow-700 bg-yellow-50',
  Low: 'text-red-700 bg-red-50',
}

export default function AdminVisitations() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [visitations, setVisitations] = useState<HomeVisitation[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loadingResidents, setLoadingResidents] = useState(true)
  const [loadingVisitations, setLoadingVisitations] = useState(false)
  const [residentSearch, setResidentSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<HomeVisitation | null>(null)

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    try {
      await deleteHomeVisitation(confirmDelete.visitationId)
      setVisitations((prev) => prev.filter((v) => v.visitationId !== confirmDelete.visitationId))
      if (expanded === confirmDelete.visitationId) setExpanded(null)
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setConfirmDelete(null)
    }
  }, [confirmDelete, expanded])

  useEffect(() => {
    fetchResidents({ caseStatus: 'Active' })
      .then(setResidents)
      .catch(console.error)
      .finally(() => setLoadingResidents(false))
  }, [])

  useEffect(() => {
    if (!selectedResident) return
    setLoadingVisitations(true)
    setVisitations([])
    setExpanded(null)
    fetchHomeVisitationsForResident(selectedResident.residentId)
      .then((vs) => setVisitations(vs.sort((a, b) => (b.visitDate ?? '').localeCompare(a.visitDate ?? ''))))
      .catch(console.error)
      .finally(() => setLoadingVisitations(false))
  }, [selectedResident])

  const filteredResidents = residentSearch
    ? residents.filter(
        (r) =>
          r.internalCode?.toLowerCase().includes(residentSearch.toLowerCase()) ||
          r.caseControlNo?.toLowerCase().includes(residentSearch.toLowerCase())
      )
    : residents

  return (
    <div className="flex h-full">
      {/* ── Resident selector ── */}
      <div className={`flex w-full flex-col border-r border-gray-100 bg-white md:w-[260px] md:shrink-0 ${selectedResident ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b border-gray-50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Active Residents</h2>
          <input
            type="text"
            value={residentSearch}
            onChange={(e) => setResidentSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingResidents ? (
            <div className="space-y-2 p-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />)}
            </div>
          ) : (
            filteredResidents.map((r) => (
              <button
                key={r.residentId}
                onClick={() => setSelectedResident(r)}
                className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                  selectedResident?.residentId === r.residentId ? 'border-blue-600 bg-blue-50' : 'border-transparent'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{r.internalCode ?? r.caseControlNo}</p>
                  <p className="text-xs text-gray-400">SH-{r.safehouseId}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Visitations panel ── */}
      <div className={`flex-1 overflow-y-auto bg-[#F7F8FA] p-4 md:p-6 ${!selectedResident ? 'hidden md:block' : ''}`}>
        {!selectedResident ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Select a resident to view their home visitations.</p>
          </div>
        ) : (
          <>
            <button
              onClick={() => setSelectedResident(null)}
              className="mb-4 flex items-center gap-1.5 text-sm text-medium-gray hover:text-black md:hidden"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to list
            </button>
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900">
                {selectedResident.internalCode} — Home Visitations
              </h1>
              <p className="text-sm text-gray-400">{visitations.length} visit{visitations.length !== 1 ? 's' : ''} recorded</p>
            </div>

            {loadingVisitations ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white" />)}
              </div>
            ) : visitations.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-400">
                No visitations recorded for this resident.
              </div>
            ) : (
              <div className="space-y-3">
                {visitations.map((v) => {
                  const isOpen = expanded === v.visitationId
                  const coopCls = COOP_COLOR[v.familyCooperationLevel ?? ''] ?? 'text-gray-600 bg-gray-100'
                  return (
                    <div key={v.visitationId} className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                      <button
                        onClick={() => setExpanded(isOpen ? null : v.visitationId)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 md:px-5 md:py-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-gray-800">{fmtDate(v.visitDate)}</span>
                            <span className="ml-2 text-xs text-gray-400">{v.visitType ?? '—'}</span>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {v.socialWorker ?? 'Unknown'} · {v.locationVisited ?? '—'}
                            </p>
                          </div>
                          <svg className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {v.familyCooperationLevel && (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${coopCls}`}>
                              {v.familyCooperationLevel}
                            </span>
                          )}
                          {v.safetyConcernsNoted && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Safety concern</span>
                          )}
                          {v.followUpNeeded && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Follow-up needed</span>
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-gray-50 px-5 py-4 space-y-4">
                          {v.purpose && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-gray-400">PURPOSE</p>
                              <p className="text-sm text-gray-700">{v.purpose}</p>
                            </div>
                          )}
                          {v.familyMembersPresent && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-gray-400">FAMILY MEMBERS PRESENT</p>
                              <p className="text-sm text-gray-700">{v.familyMembersPresent}</p>
                            </div>
                          )}
                          {v.observations && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-gray-400">OBSERVATIONS</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{v.observations}</p>
                            </div>
                          )}
                          {v.visitOutcome && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-gray-400">OUTCOME</p>
                              <p className="text-sm text-gray-700">{v.visitOutcome}</p>
                            </div>
                          )}
                          {v.followUpNeeded && v.followUpNotes && (
                            <div className="rounded-lg bg-amber-50 px-4 py-3">
                              <p className="text-xs font-semibold text-amber-700">FOLLOW-UP NOTES</p>
                              <p className="mt-1 text-sm text-amber-800">{v.followUpNotes}</p>
                            </div>
                          )}
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => setConfirmDelete(v)}
                              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete visitation"
        message={`Are you sure you want to delete the visitation from ${confirmDelete?.visitDate ? new Date(confirmDelete.visitDate).toLocaleDateString() : 'this date'}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
