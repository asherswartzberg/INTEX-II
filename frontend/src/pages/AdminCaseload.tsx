import { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { createResident, deleteResident, updateResident } from '../apis/residentsApi'
import { fetchEducationRecordsForResident } from '../apis/educationRecordsApi'
import { fetchHealthRecordsForResident } from '../apis/healthWellbeingRecordsApi'
import type { Resident } from '../types/Resident'
import type { EducationRecord } from '../types/EducationRecord'
import type { HealthWellbeingRecord } from '../types/HealthWellbeingRecord'
import ConfirmDialog from '../components/ConfirmDialog'
import { useCaseloadContext } from './AdminCaseloadLayout'

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

function blankResident(): Resident {
  return {
    residentId: 0, caseControlNo: null, internalCode: null, safehouseId: null,
    caseStatus: 'Active', sex: null, dateOfBirth: null, birthStatus: null,
    placeOfBirth: null, religion: null, caseCategory: null,
    subCatOrphaned: false, subCatTrafficked: false, subCatChildLabor: false,
    subCatPhysicalAbuse: false, subCatSexualAbuse: false, subCatOsaec: false,
    subCatCicl: false, subCatAtRisk: false, subCatStreetChild: false, subCatChildWithHiv: false,
    isPwd: false, pwdType: null, hasSpecialNeeds: false, specialNeedsDiagnosis: null,
    familyIs4ps: false, familySoloParent: false, familyIndigenous: false,
    familyParentPwd: false, familyInformalSettler: false,
    dateOfAdmission: null, ageUponAdmission: null, presentAge: null, lengthOfStay: null,
    referralSource: null, referringAgencyPerson: null, dateColbRegistered: null,
    dateColbObtained: null, assignedSocialWorker: null, initialCaseAssessment: null,
    dateCaseStudyPrepared: null, reintegrationType: null, reintegrationStatus: null,
    initialRiskLevel: null, currentRiskLevel: null, dateEnrolled: null, dateClosed: null,
    createdAt: null, notesRestricted: null,
  }
}

type RecordsPanel = 'none' | 'education' | 'health'

export default function AdminCaseload() {
  const { selected, setSelected, isAdmin, riskScoreMap, refreshResidents, registerNewResidentHandler } = useCaseloadContext()
  const location = useLocation()
  const navigate = useNavigate()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Resident | null>(null)
  const [editing, setEditing] = useState<Resident | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<Resident>(blankResident())
  const [eduRecords, setEduRecords] = useState<EducationRecord[]>([])
  const [healthRecords, setHealthRecords] = useState<HealthWellbeingRecord[]>([])
  const [recordsPanel, setRecordsPanel] = useState<RecordsPanel>('none')

  useEffect(() => {
    if (!selected) {
      setEduRecords([])
      setHealthRecords([])
      return
    }
    fetchEducationRecordsForResident(selected.residentId).then(setEduRecords).catch(() => setEduRecords([]))
    fetchHealthRecordsForResident(selected.residentId).then(setHealthRecords).catch(() => setHealthRecords([]))
  }, [selected?.residentId])

  useEffect(() => {
    setRecordsPanel('none')
  }, [selected?.residentId])

  const openCreate = useCallback(() => {
    setCreating(true)
    setEditing(null)
    setFormData(blankResident())
  }, [])

  useEffect(() => {
    if (!isAdmin) {
      registerNewResidentHandler(null)
      return
    }
    registerNewResidentHandler(openCreate)
    return () => registerNewResidentHandler(null)
  }, [isAdmin, openCreate, registerNewResidentHandler])

  useEffect(() => {
    const st = location.state as { openCreate?: boolean } | undefined
    if (st?.openCreate && isAdmin) {
      openCreate()
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, location.search, navigate, openCreate, isAdmin])

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return
    try {
      await deleteResident(confirmDelete.residentId)
      await refreshResidents()
      if (selected?.residentId === confirmDelete.residentId) setSelected(null)
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setConfirmDelete(null)
    }
  }, [confirmDelete, refreshResidents, selected, setSelected])

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

  if (!selected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-gray-400">Select a resident to view their information.</p>
        {(creating || editing) && renderModal()}
      </div>
    )
  }

  function renderModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 dark:bg-[#1a1a1a]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editing ? 'Edit Resident Profile' : 'Create Resident Profile'}
            </h3>
            <button onClick={() => { setEditing(null); setCreating(false) }} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">Close</button>
          </div>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input value={formData.caseControlNo ?? ''} onChange={(e) => setField('caseControlNo', e.target.value || null)} placeholder="Case control no" className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
            <input value={formData.internalCode ?? ''} onChange={(e) => setField('internalCode', e.target.value || null)} placeholder="Internal code" className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
            <input value={formData.assignedSocialWorker ?? ''} onChange={(e) => setField('assignedSocialWorker', e.target.value || null)} placeholder="Assigned social worker" className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
            <input value={formData.referralSource ?? ''} onChange={(e) => setField('referralSource', e.target.value || null)} placeholder="Referral source" className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
            <select value={formData.caseStatus ?? ''} onChange={(e) => setField('caseStatus', e.target.value || null)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100"><option value="">Case status</option><option>Active</option><option>Closed</option><option>Transferred</option></select>
            <select value={formData.caseCategory ?? ''} onChange={(e) => setField('caseCategory', e.target.value || null)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100"><option value="">Case category</option><option>Trafficked</option><option>Physical Abuse</option><option>Neglected</option><option>Child Labor</option><option>At Risk</option></select>
            <input type="number" value={formData.safehouseId ?? ''} onChange={(e) => setField('safehouseId', e.target.value ? Number(e.target.value) : null)} placeholder="Safehouse ID" className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
            <input value={formData.reintegrationStatus ?? ''} onChange={(e) => setField('reintegrationStatus', e.target.value || null)} placeholder="Reintegration status" className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
            <input type="date" value={formData.dateOfBirth ?? ''} onChange={(e) => setField('dateOfBirth', e.target.value || null)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
            <input type="date" value={formData.dateOfAdmission ?? ''} onChange={(e) => setField('dateOfAdmission', e.target.value || null)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-700 dark:text-gray-300 md:grid-cols-4">
            {[
              ['subCatTrafficked', 'Trafficked'], ['subCatPhysicalAbuse', 'Physical abuse'],
              ['subCatChildLabor', 'Child labor'], ['subCatAtRisk', 'At risk'],
              ['familyIs4ps', '4Ps'], ['familySoloParent', 'Solo parent'],
              ['familyIndigenous', 'Indigenous'], ['familyInformalSettler', 'Informal settler'],
              ['isPwd', 'PWD'], ['hasSpecialNeeds', 'Special needs'],
            ].map(([field, label]) => (
              <label key={field} className="flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5 dark:border-[#444]">
                <input type="checkbox" checked={Boolean(formData[field as keyof Resident])} onChange={(e) => setField(field as keyof Resident, e.target.checked as never)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <textarea value={formData.notesRestricted ?? ''} onChange={(e) => setField('notesRestricted', e.target.value || null)} placeholder="Case notes" className="mt-4 min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => { setEditing(null); setCreating(false) }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-[#444] dark:text-gray-300">Cancel</button>
            <button onClick={saveResident} disabled={saving} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black">{saving ? 'Saving...' : editing ? 'Update resident' : 'Create resident'}</button>
          </div>
        </div>
      </div>
    )
  }

  const riskScore = riskScoreMap.get(selected.residentId)

  const detailPairs: [string, string | null | undefined][] = [
    ['Case No', selected.caseControlNo],
    ['Age', calcAge(selected.dateOfBirth)],
    ['Safehouse', `SH-${selected.safehouseId ?? '?'}`],
    ['Category', selected.caseCategory],
    ['Reintegration', selected.reintegrationStatus],
    ['Admitted', fmtDate(selected.dateOfAdmission)],
    ['Social Worker', selected.assignedSocialWorker],
    ['Referral Source', selected.referralSource],
    ['Reint. Type', selected.reintegrationType],
  ]

  return (
    <>
      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">{selected.internalCode}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[selected.caseStatus ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>{selected.caseStatus ?? '—'}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_STYLE[selected.currentRiskLevel ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>{selected.currentRiskLevel ?? '—'} Risk</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button onClick={() => openEdit(selected)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-[#444] dark:bg-transparent dark:text-gray-300">Edit</button>
                <button onClick={() => setConfirmDelete(selected)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-transparent dark:text-red-400">Delete</button>
              </>
            )}
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        {/* Details — full width */}
        <div className="mb-5 border-b border-gray-100 pb-5 dark:border-[#333]">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {detailPairs.map(([label, value]) => value ? (
              <div key={label} className="flex justify-between gap-2 sm:flex-col sm:justify-start">
                <dt className="shrink-0 text-xs text-gray-400">{label}</dt>
                <dd className="truncate text-right font-medium text-gray-700 dark:text-gray-200 sm:text-left">{value}</dd>
              </div>
            ) : null)}
          </dl>

          {/* Stacked: case flags, then predicted risk (always below flags row), then special needs */}
          <div className="mt-4 flex w-full flex-col gap-4">
            {subCategories(selected).length > 0 && (
              <div className="w-full">
                <p className="mb-1.5 text-xs font-semibold text-gray-400">CASE FLAGS</p>
                <div className="flex flex-wrap gap-1.5">
                  {subCategories(selected).map((c) => (
                    <span key={c as string} className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {riskScore && (
              <div className="w-full">
                <p className="mb-1.5 text-xs font-semibold text-gray-400">PREDICTED RISK</p>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PREDICTED_RISK_STYLE[riskScore.riskLabel ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>{riskScore.riskLabel ?? '—'}</span>
                  {riskScore.incidentRiskScore != null && <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{Math.round(riskScore.incidentRiskScore * 100)}%</span>}
                </div>
                {riskScore.topFactors && <p className="mt-1 text-xs text-gray-500"><span className="font-medium text-gray-600 dark:text-gray-400">Factors:</span> {riskScore.topFactors}</p>}
              </div>
            )}

            {(selected.isPwd || selected.hasSpecialNeeds) && (
              <div className="w-full">
                <p className="mb-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">SPECIAL NEEDS</p>
                {selected.isPwd && <p className="text-xs text-amber-600 dark:text-amber-300">PWD: {selected.pwdType ?? 'Yes'}</p>}
                {selected.hasSpecialNeeds && <p className="text-xs text-amber-600 dark:text-amber-300">Diagnosis: {selected.specialNeedsDiagnosis ?? 'Noted'}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Education OR Health — mutually exclusive, full width */}
        <div className="w-full space-y-2">
          <button
            type="button"
            onClick={() => setRecordsPanel((p) => (p === 'education' ? 'none' : 'education'))}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors ${
              recordsPanel === 'education'
                ? 'bg-gray-100 dark:bg-[#2a2a2a]'
                : 'bg-gray-50 hover:bg-gray-100 dark:bg-[#222] dark:hover:bg-[#2a2a2a]'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Education Records <span className="normal-case font-normal text-gray-400">({eduRecords.length})</span></span>
            <svg className={`shrink-0 text-gray-400 transition-transform duration-200 ${recordsPanel === 'education' ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {recordsPanel === 'education' && (
            <div className="w-full space-y-2.5 pb-1">
              {eduRecords.length === 0 ? (
                <p className="px-1 py-2 text-xs text-gray-400">No education records found.</p>
              ) : (
                [...eduRecords]
                  .sort((a, b) => new Date(b.recordDate ?? 0).getTime() - new Date(a.recordDate ?? 0).getTime())
                  .map(rec => (
                    <div key={rec.educationRecordId} className="rounded-lg border border-gray-100 px-3 py-2.5 dark:border-[#333]">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{fmtDate(rec.recordDate)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${rec.completionStatus === 'Completed' ? 'bg-green-100 text-green-700' : rec.completionStatus === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{rec.completionStatus ?? '—'}</span>
                      </div>
                      <dl className="space-y-1 text-xs">
                        {rec.educationLevel && <div className="flex justify-between"><dt className="text-gray-400">Level</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.educationLevel}</dd></div>}
                        {rec.schoolName && <div className="flex justify-between"><dt className="text-gray-400">School</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.schoolName}</dd></div>}
                        {rec.enrollmentStatus && <div className="flex justify-between"><dt className="text-gray-400">Enrollment</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.enrollmentStatus}</dd></div>}
                        {rec.attendanceRate != null && <div className="flex justify-between"><dt className="text-gray-400">Attendance</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.attendanceRate.toFixed(1)}%</dd></div>}
                        {rec.progressPercent != null && <div className="flex justify-between"><dt className="text-gray-400">Progress</dt><dd className="font-medium text-gray-600 dark:text-gray-300">{rec.progressPercent.toFixed(1)}%</dd></div>}
                      </dl>
                    </div>
                  ))
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setRecordsPanel((p) => (p === 'health' ? 'none' : 'health'))}
            className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors ${
              recordsPanel === 'health'
                ? 'bg-gray-100 dark:bg-[#2a2a2a]'
                : 'bg-gray-50 hover:bg-gray-100 dark:bg-[#222] dark:hover:bg-[#2a2a2a]'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Health Records <span className="normal-case font-normal text-gray-400">({healthRecords.length})</span></span>
            <svg className={`shrink-0 text-gray-400 transition-transform duration-200 ${recordsPanel === 'health' ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {recordsPanel === 'health' && (
            <div className="w-full space-y-2.5 pb-1">
              {healthRecords.length === 0 ? (
                <p className="px-1 py-2 text-xs text-gray-400">No health records found.</p>
              ) : (
                [...healthRecords]
                  .sort((a, b) => new Date(b.recordDate ?? 0).getTime() - new Date(a.recordDate ?? 0).getTime())
                  .map(rec => (
                    <div key={rec.healthRecordId} className="rounded-lg border border-gray-100 px-3 py-2.5 dark:border-[#333]">
                      <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-200">{fmtDate(rec.recordDate)}</p>
                      <dl className="space-y-1 text-xs">
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
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete resident"
        message={`Are you sure you want to delete ${confirmDelete?.internalCode ?? 'this resident'}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {(creating || editing) && renderModal()}
    </>
  )
}
