import { useEffect, useState, useCallback } from 'react'
import {
  fetchProcessRecordingsForResident,
  createProcessRecording,
  updateProcessRecording,
  deleteProcessRecording,
} from '../apis/processRecordingsApi'
import type { ProcessRecording } from '../types/ProcessRecording'
import ConfirmDialog from '../components/ConfirmDialog'
import { useCaseloadContext } from './AdminCaseloadLayout'

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const EMOTION_OPTIONS = ['Calm', 'Anxious', 'Sad', 'Angry', 'Hopeful', 'Withdrawn', 'Happy', 'Distressed']
const SESSION_TYPE_OPTIONS = ['Individual', 'Group']

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

function blankRecording(residentId: number): ProcessRecording {
  return {
    recordingId: 0, residentId,
    sessionDate: new Date().toISOString().slice(0, 10),
    socialWorker: '', sessionType: 'Individual', sessionDurationMinutes: 60,
    emotionalStateObserved: null, emotionalStateEnd: null,
    sessionNarrative: '', interventionsApplied: '', followUpActions: '',
    progressNoted: false, concernsFlagged: false, referralMade: false, notesRestricted: null,
  }
}

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none dark:border-[#444] dark:bg-[#111] dark:text-gray-100'
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1'

export default function AdminCounseling() {
  const { selected } = useCaseloadContext()

  const [recordings, setRecordings] = useState<ProcessRecording[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loadingRecordings, setLoadingRecordings] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ProcessRecording | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProcessRecording | null>(null)
  const [formData, setFormData] = useState<ProcessRecording>(blankRecording(0))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const refreshRecordings = useCallback(async (residentId: number) => {
    setLoadingRecordings(true)
    try {
      const rs = await fetchProcessRecordingsForResident(residentId)
      setRecordings(rs.sort((a, b) => (b.sessionDate ?? '').localeCompare(a.sessionDate ?? '')))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingRecordings(false)
    }
  }, [])

  const openCreate = () => {
    if (!selected) return
    setEditing(null)
    setFormData(blankRecording(selected.residentId))
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (rec: ProcessRecording) => {
    setEditing(rec)
    setFormData({ ...rec })
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
    if (!formData.sessionDate) {
      setFormError('Session date is required.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await updateProcessRecording(editing.recordingId, {
          ...formData,
          recordingId: editing.recordingId,
          residentId: selected.residentId,
        })
      } else {
        await createProcessRecording({
          ...formData,
          recordingId: 0,
          residentId: selected.residentId,
        })
      }
      closeForm()
      await refreshRecordings(selected.residentId)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = useCallback(async () => {
    if (!confirmDelete || !selected) return
    try {
      await deleteProcessRecording(confirmDelete.recordingId)
      setRecordings((prev) => prev.filter((r) => r.recordingId !== confirmDelete.recordingId))
      if (expanded === confirmDelete.recordingId) setExpanded(null)
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setConfirmDelete(null)
    }
  }, [confirmDelete, expanded, selected])

  useEffect(() => {
    if (!selected) {
      setRecordings([])
      setExpanded(null)
      closeForm()
      return
    }
    setRecordings([])
    setExpanded(null)
    closeForm()
    refreshRecordings(selected.residentId)
  }, [selected?.residentId, refreshRecordings])

  const setField = <K extends keyof ProcessRecording>(key: K, value: ProcessRecording[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }))

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-gray-400">Select a resident to view their counseling sessions.</p>
      </div>
    )
  }

  if (formOpen) {
    return (
      <div className="overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {editing ? 'Edit Session' : 'New Counseling Session'}
            </h1>
            <button onClick={closeForm} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#222]">Cancel</button>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Resident: <span className="font-medium text-gray-700 dark:text-gray-300">{selected.internalCode}</span>
          </p>
          {formError && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{formError}</div>}
          <div className="space-y-5 rounded-xl border border-gray-100 bg-white p-6 dark:bg-[#1a1a1a] dark:border-[#333]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Session Date *</label>
                <input type="date" value={formData.sessionDate ?? ''} onChange={(e) => setField('sessionDate', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Session Type</label>
                <select value={formData.sessionType ?? ''} onChange={(e) => setField('sessionType', e.target.value)} className={inputCls}>
                  <option value="">Select...</option>
                  {SESSION_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Duration (min)</label>
                <input type="number" min={0} value={formData.sessionDurationMinutes ?? ''} onChange={(e) => setField('sessionDurationMinutes', e.target.value ? Number(e.target.value) : null)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Social Worker</label>
              <input type="text" value={formData.socialWorker ?? ''} onChange={(e) => setField('socialWorker', e.target.value)} placeholder="Name of social worker" className={inputCls} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Emotional State (Start)</label>
                <select value={formData.emotionalStateObserved ?? ''} onChange={(e) => setField('emotionalStateObserved', e.target.value || null)} className={inputCls}>
                  <option value="">Select...</option>
                  {EMOTION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Emotional State (End)</label>
                <select value={formData.emotionalStateEnd ?? ''} onChange={(e) => setField('emotionalStateEnd', e.target.value || null)} className={inputCls}>
                  <option value="">Select...</option>
                  {EMOTION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Session Narrative</label>
              <textarea rows={4} value={formData.sessionNarrative ?? ''} onChange={(e) => setField('sessionNarrative', e.target.value)} placeholder="What was discussed, what was observed..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Interventions Applied</label>
              <textarea rows={3} value={formData.interventionsApplied ?? ''} onChange={(e) => setField('interventionsApplied', e.target.value)} placeholder="Description of interventions or techniques used" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Follow-Up Actions</label>
              <textarea rows={2} value={formData.followUpActions ?? ''} onChange={(e) => setField('followUpActions', e.target.value)} placeholder="Planned follow-up actions" className={inputCls} />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.progressNoted ?? false} onChange={(e) => setField('progressNoted', e.target.checked)} className="h-4 w-4 rounded border-gray-300" /> Progress noted
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.concernsFlagged ?? false} onChange={(e) => setField('concernsFlagged', e.target.checked)} className="h-4 w-4 rounded border-gray-300" /> Concerns flagged
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={formData.referralMade ?? false} onChange={(e) => setField('referralMade', e.target.checked)} className="h-4 w-4 rounded border-gray-300" /> Referral made
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeForm} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#222]">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200">
                {saving ? 'Saving...' : editing ? 'Update Session' : 'Create Session'}
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
              {selected.internalCode} — Counseling Sessions
            </h1>
            <p className="text-sm text-gray-400">
              {recordings.length} session{recordings.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
          <button onClick={openCreate} className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200">
            + New Session
          </button>
        </div>

        {loadingRecordings ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-[#222]" />)}
          </div>
        ) : recordings.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-400 dark:bg-[#222]">
            No sessions recorded for this resident.
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => {
              const isOpen = expanded === rec.recordingId
              return (
                <div key={rec.recordingId} className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:bg-[#222] dark:border-[#333]">
                  <button onClick={() => setExpanded(isOpen ? null : rec.recordingId)} className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-[#2a2a2a] md:px-5 md:py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fmtDate(rec.sessionDate)}</span>
                        <span className="ml-2 text-xs text-gray-400">{rec.sessionType ?? '—'}</span>
                        {rec.sessionDurationMinutes && <span className="ml-1 text-xs text-gray-400">· {rec.sessionDurationMinutes} min</span>}
                        <p className="mt-0.5 text-xs text-gray-500">{rec.socialWorker ?? 'Unknown worker'}</p>
                      </div>
                      <svg className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {emotionBadge(rec.emotionalStateObserved)}
                      {rec.concernsFlagged && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Concern</span>}
                      {rec.progressNoted && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Progress</span>}
                      {rec.referralMade && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Referral</span>}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="space-y-4 border-t border-gray-100 px-5 py-4 dark:border-[#333]">
                      {(rec.emotionalStateObserved || rec.emotionalStateEnd) && (
                        <div className="flex items-center gap-2">
                          {emotionBadge(rec.emotionalStateObserved)}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                          {emotionBadge(rec.emotionalStateEnd)}
                        </div>
                      )}
                      {rec.sessionNarrative && <div><p className="mb-1 text-xs font-semibold text-gray-400">SESSION NARRATIVE</p><p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{rec.sessionNarrative}</p></div>}
                      {rec.interventionsApplied && <div><p className="mb-1 text-xs font-semibold text-gray-400">INTERVENTIONS APPLIED</p><p className="text-sm text-gray-700 dark:text-gray-300">{rec.interventionsApplied}</p></div>}
                      {rec.followUpActions && <div><p className="mb-1 text-xs font-semibold text-gray-400">FOLLOW-UP ACTIONS</p><p className="text-sm text-gray-700 dark:text-gray-300">{rec.followUpActions}</p></div>}
                      <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => openEdit(rec)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:bg-transparent dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#333]">Edit</button>
                        <button onClick={() => setConfirmDelete(rec)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:bg-transparent dark:border-red-800 dark:hover:bg-red-950">Delete</button>
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
        title="Delete recording"
        message={`Are you sure you want to delete the session from ${confirmDelete?.sessionDate ? new Date(confirmDelete.sessionDate).toLocaleDateString() : 'this date'}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}
