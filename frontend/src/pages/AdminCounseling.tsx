import { useEffect, useState } from 'react'
import { fetchResidents } from '../apis/residentsApi'
import { fetchProcessRecordingsForResident } from '../apis/processRecordingsApi'
import type { Resident } from '../types/Resident'
import type { ProcessRecording } from '../types/ProcessRecording'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const EMOTION_COLOR: Record<string, string> = {
  Calm: 'text-green-600 bg-green-50',
  Anxious: 'text-yellow-700 bg-yellow-50',
  Sad: 'text-blue-600 bg-blue-50',
  Angry: 'text-red-600 bg-red-50',
  Happy: 'text-emerald-600 bg-emerald-50',
  Withdrawn: 'text-purple-600 bg-purple-50',
}

function emotionBadge(e: string | null) {
  if (!e) return null
  const cls = EMOTION_COLOR[e] ?? 'text-gray-600 bg-gray-100'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{e}</span>
}

export default function AdminCounseling() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [recordings, setRecordings] = useState<ProcessRecording[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loadingResidents, setLoadingResidents] = useState(true)
  const [loadingRecordings, setLoadingRecordings] = useState(false)
  const [residentSearch, setResidentSearch] = useState('')

  useEffect(() => {
    fetchResidents({ caseStatus: 'Active' })
      .then(setResidents)
      .catch(console.error)
      .finally(() => setLoadingResidents(false))
  }, [])

  useEffect(() => {
    if (!selectedResident) return
    setLoadingRecordings(true)
    setRecordings([])
    setExpanded(null)
    fetchProcessRecordingsForResident(selectedResident.residentId)
      .then((rs) => setRecordings(rs.sort((a, b) => (b.sessionDate ?? '').localeCompare(a.sessionDate ?? ''))))
      .catch(console.error)
      .finally(() => setLoadingRecordings(false))
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
      <div className="flex w-[260px] shrink-0 flex-col border-r border-gray-100 bg-white">
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
                  <p className="text-xs text-gray-400">SH-{r.safehouseId} · {r.currentRiskLevel ?? 'Unknown'} risk</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Recordings panel ── */}
      <div className="flex-1 overflow-y-auto bg-[#F7F8FA] p-6">
        {!selectedResident ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Select a resident to view their counseling sessions.</p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {selectedResident.internalCode} — Counseling Sessions
                </h1>
                <p className="text-sm text-gray-400">{recordings.length} session{recordings.length !== 1 ? 's' : ''} recorded</p>
              </div>
            </div>

            {loadingRecordings ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white" />)}
              </div>
            ) : recordings.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-400">
                No sessions recorded for this resident.
              </div>
            ) : (
              <div className="space-y-3">
                {recordings.map((rec) => {
                  const isOpen = expanded === rec.recordingId
                  return (
                    <div key={rec.recordingId} className="rounded-xl border border-gray-100 bg-white overflow-hidden">
                      {/* Summary row */}
                      <button
                        onClick={() => setExpanded(isOpen ? null : rec.recordingId)}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">{fmtDate(rec.sessionDate)}</span>
                            <span className="text-xs text-gray-400">{rec.sessionType ?? '—'}</span>
                            {rec.sessionDurationMinutes && (
                              <span className="text-xs text-gray-400">{rec.sessionDurationMinutes} min</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-500">{rec.socialWorker ?? 'Unknown worker'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {emotionBadge(rec.emotionalStateObserved)}
                          {rec.concernsFlagged && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Concern</span>
                          )}
                          {rec.progressNoted && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Progress</span>
                          )}
                          {rec.referralMade && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Referral</span>
                          )}
                          <svg
                            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="border-t border-gray-50 px-5 py-4 space-y-4">
                          {/* Emotional arc */}
                          {(rec.emotionalStateObserved || rec.emotionalStateEnd) && (
                            <div className="flex items-center gap-2">
                              {emotionBadge(rec.emotionalStateObserved)}
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                              {emotionBadge(rec.emotionalStateEnd)}
                            </div>
                          )}

                          {rec.sessionNarrative && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-gray-400">SESSION NARRATIVE</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{rec.sessionNarrative}</p>
                            </div>
                          )}
                          {rec.interventionsApplied && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-gray-400">INTERVENTIONS APPLIED</p>
                              <p className="text-sm text-gray-700">{rec.interventionsApplied}</p>
                            </div>
                          )}
                          {rec.followUpActions && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-gray-400">FOLLOW-UP ACTIONS</p>
                              <p className="text-sm text-gray-700">{rec.followUpActions}</p>
                            </div>
                          )}
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
    </div>
  )
}
