import { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { createResident, deleteResident, updateResident } from '../apis/residentsApi'
import { fetchSafehouses } from '../apis/safehousesApi'
import { fetchEducationRecordsForResident } from '../apis/educationRecordsApi'
import { fetchHealthRecordsForResident } from '../apis/healthWellbeingRecordsApi'
import { ApiError } from '../apis/client'
import type { Resident } from '../types/Resident'
import type { Safehouse } from '../types/Safehouse'
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

function formatResidentSaveError(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = err.body?.trim()
    return detail ? `${err.message}: ${detail.slice(0, 500)}` : err.message
  }
  return err instanceof Error ? err.message : 'Save failed'
}

function safehouseOptionLabel(sh: Safehouse): string {
  const name = sh.name?.trim()
  if (name) return name
  const code = sh.safehouseCode?.trim()
  if (code) return code
  return `SH-${sh.safehouseId}`
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100'

const REQUIRED_RESIDENT_FIELDS: { key: keyof Resident; label: string }[] = [
  { key: 'caseControlNo', label: 'Case control number' },
  { key: 'internalCode', label: 'Internal code' },
  { key: 'safehouseId', label: 'Safehouse' },
  { key: 'caseStatus', label: 'Case status' },
  { key: 'sex', label: 'Sex' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'birthStatus', label: 'Birth status' },
  { key: 'placeOfBirth', label: 'Place of birth' },
  { key: 'religion', label: 'Religion' },
  { key: 'caseCategory', label: 'Case category' },
  { key: 'dateOfAdmission', label: 'Date of admission' },
  { key: 'ageUponAdmission', label: 'Age upon admission' },
  { key: 'presentAge', label: 'Present age' },
  { key: 'lengthOfStay', label: 'Length of stay' },
  { key: 'referralSource', label: 'Referral source' },
  { key: 'assignedSocialWorker', label: 'Assigned social worker' },
  { key: 'initialCaseAssessment', label: 'Initial case assessment' },
  { key: 'reintegrationType', label: 'Reintegration type' },
  { key: 'reintegrationStatus', label: 'Reintegration status' },
  { key: 'initialRiskLevel', label: 'Initial risk level' },
  { key: 'currentRiskLevel', label: 'Current risk level' },
  { key: 'dateEnrolled', label: 'Date enrolled' },
]

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
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [safehousesLoadError, setSafehousesLoadError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

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
    setError(null)
    setValidationError(null)
    setCreating(true)
    setEditing(null)
    setFormData(blankResident())
  }, [])

  useEffect(() => {
    if (!creating && !editing) return
    let cancelled = false
    setSafehousesLoadError(null)
    fetchSafehouses()
      .then((list) => {
        if (!cancelled) setSafehouses(list)
      })
      .catch((err) => {
        if (!cancelled) {
          setSafehousesLoadError(err instanceof Error ? err.message : 'Failed to load safehouses')
          setSafehouses([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [creating, editing])

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
    setError(null)
    setValidationError(null)
    setCreating(false)
    setEditing(resident)
    setFormData(resident)
  }

  async function saveResident() {
    try {
      setSaving(true)
      setError(null)
      setValidationError(null)
      const missing = REQUIRED_RESIDENT_FIELDS.filter(({ key }) => {
        const value = formData[key]
        if (typeof value === 'string') return value.trim().length === 0
        return value === null || value === undefined
      }).map(({ label }) => label)
      if (missing.length > 0) {
        setValidationError(`Please complete required fields: ${missing.join(', ')}`)
        return
      }
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
      setError(formatResidentSaveError(err))
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
            <button onClick={() => { setError(null); setValidationError(null); setEditing(null); setCreating(false) }} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">Close</button>
          </div>
          {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {validationError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{validationError}</p>}
          {safehousesLoadError && (
            <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">{safehousesLoadError}</p>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="resident-case-control" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Case control number *</label>
              <input id="resident-case-control" value={formData.caseControlNo ?? ''} onChange={(e) => setField('caseControlNo', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-internal-code" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Internal code *</label>
              <input id="resident-internal-code" value={formData.internalCode ?? ''} onChange={(e) => setField('internalCode', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-social-worker" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Assigned social worker *</label>
              <input id="resident-social-worker" value={formData.assignedSocialWorker ?? ''} onChange={(e) => setField('assignedSocialWorker', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-referral" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Referral source *</label>
              <input id="resident-referral" value={formData.referralSource ?? ''} onChange={(e) => setField('referralSource', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-case-status" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Case status *</label>
              <select id="resident-case-status" value={formData.caseStatus ?? ''} onChange={(e) => setField('caseStatus', e.target.value || null)} className={INPUT_CLASS}>
                <option value="">Select…</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
                <option value="Transferred">Transferred</option>
              </select>
            </div>
            <div>
              <label htmlFor="resident-case-category" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Case category *</label>
              <select id="resident-case-category" value={formData.caseCategory ?? ''} onChange={(e) => setField('caseCategory', e.target.value || null)} className={INPUT_CLASS}>
                <option value="">Select…</option>
                <option value="Trafficked">Trafficked</option>
                <option value="Physical Abuse">Physical Abuse</option>
                <option value="Neglected">Neglected</option>
                <option value="Child Labor">Child Labor</option>
                <option value="At Risk">At Risk</option>
              </select>
            </div>
            <div>
              <label htmlFor="resident-safehouse" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Safehouse *</label>
              <select
                id="resident-safehouse"
                value={formData.safehouseId ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setField('safehouseId', v === '' ? null : Number(v))
                }}
                className={INPUT_CLASS}
              >
                <option value="">Unassigned</option>
                {formData.safehouseId != null &&
                  !safehouses.some((s) => s.safehouseId === formData.safehouseId) && (
                    <option value={formData.safehouseId}>{`SH-${formData.safehouseId} (current)`}</option>
                  )}
                {safehouses.map((sh) => (
                  <option key={sh.safehouseId} value={sh.safehouseId}>
                    {safehouseOptionLabel(sh)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="resident-reintegration" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Reintegration status *</label>
              <input id="resident-reintegration" value={formData.reintegrationStatus ?? ''} onChange={(e) => setField('reintegrationStatus', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-dob" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Date of birth *</label>
              <input id="resident-dob" type="date" value={formData.dateOfBirth ?? ''} onChange={(e) => setField('dateOfBirth', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-admission" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Date of admission *</label>
              <input id="resident-admission" type="date" value={formData.dateOfAdmission ?? ''} onChange={(e) => setField('dateOfAdmission', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-sex" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Sex *</label>
              <input id="resident-sex" value={formData.sex ?? ''} onChange={(e) => setField('sex', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-birth-status" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Birth status *</label>
              <input id="resident-birth-status" value={formData.birthStatus ?? ''} onChange={(e) => setField('birthStatus', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-place-of-birth" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Place of birth *</label>
              <input id="resident-place-of-birth" value={formData.placeOfBirth ?? ''} onChange={(e) => setField('placeOfBirth', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-religion" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Religion *</label>
              <input id="resident-religion" value={formData.religion ?? ''} onChange={(e) => setField('religion', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-age-upon-admission" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Age upon admission *</label>
              <input id="resident-age-upon-admission" value={formData.ageUponAdmission ?? ''} onChange={(e) => setField('ageUponAdmission', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-present-age" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Present age *</label>
              <input id="resident-present-age" value={formData.presentAge ?? ''} onChange={(e) => setField('presentAge', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-length-of-stay" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Length of stay *</label>
              <input id="resident-length-of-stay" value={formData.lengthOfStay ?? ''} onChange={(e) => setField('lengthOfStay', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-initial-assessment" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Initial case assessment *</label>
              <input id="resident-initial-assessment" value={formData.initialCaseAssessment ?? ''} onChange={(e) => setField('initialCaseAssessment', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-reintegration-type" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Reintegration type *</label>
              <input id="resident-reintegration-type" value={formData.reintegrationType ?? ''} onChange={(e) => setField('reintegrationType', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-initial-risk" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Initial risk level *</label>
              <input id="resident-initial-risk" value={formData.initialRiskLevel ?? ''} onChange={(e) => setField('initialRiskLevel', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-current-risk" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Current risk level *</label>
              <input id="resident-current-risk" value={formData.currentRiskLevel ?? ''} onChange={(e) => setField('currentRiskLevel', e.target.value || null)} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="resident-date-enrolled" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Date enrolled *</label>
              <input id="resident-date-enrolled" type="date" value={formData.dateEnrolled ?? ''} onChange={(e) => setField('dateEnrolled', e.target.value || null)} className={INPUT_CLASS} />
            </div>
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
          <div className="mt-4">
            <label htmlFor="resident-notes" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Case notes</label>
            <textarea id="resident-notes" value={formData.notesRestricted ?? ''} onChange={(e) => setField('notesRestricted', e.target.value || null)} className="min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-[#444] dark:bg-[#111] dark:text-gray-100" />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => { setError(null); setValidationError(null); setEditing(null); setCreating(false) }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-[#444] dark:text-gray-300">Cancel</button>
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

        {/* Education / Health — side-by-side tabs; content full width below */}
        <div className="w-full">
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={() => setRecordsPanel((p) => (p === 'education' ? 'none' : 'education'))}
              className={`min-w-0 flex-1 rounded-lg px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide transition-colors ${
                recordsPanel === 'education'
                  ? 'bg-gray-100 text-gray-900 ring-1 ring-gray-200 dark:bg-[#2a2a2a] dark:text-white dark:ring-[#444]'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-[#222] dark:text-gray-400 dark:hover:bg-[#2a2a2a]'
              }`}
            >
              <span className="block truncate">Education</span>
              <span className="mt-0.5 block text-[10px] font-normal normal-case text-gray-400 dark:text-gray-500">{eduRecords.length} record{eduRecords.length !== 1 ? 's' : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => setRecordsPanel((p) => (p === 'health' ? 'none' : 'health'))}
              className={`min-w-0 flex-1 rounded-lg px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide transition-colors ${
                recordsPanel === 'health'
                  ? 'bg-gray-100 text-gray-900 ring-1 ring-gray-200 dark:bg-[#2a2a2a] dark:text-white dark:ring-[#444]'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-[#222] dark:text-gray-400 dark:hover:bg-[#2a2a2a]'
              }`}
            >
              <span className="block truncate">Health</span>
              <span className="mt-0.5 block text-[10px] font-normal normal-case text-gray-400 dark:text-gray-500">{healthRecords.length} record{healthRecords.length !== 1 ? 's' : ''}</span>
            </button>
          </div>

          {recordsPanel !== 'none' && (
            <div className="mt-4 w-full min-w-0 border-t border-gray-100 pt-4 dark:border-[#333]">
              {recordsPanel === 'education' && (
                <div className="w-full space-y-4">
                  {eduRecords.length === 0 ? (
                    <p className="text-sm text-gray-400">No education records found.</p>
                  ) : (
                    [...eduRecords]
                      .sort((a, b) => new Date(b.recordDate ?? 0).getTime() - new Date(a.recordDate ?? 0).getTime())
                      .map(rec => (
                        <div key={rec.educationRecordId} className="w-full min-w-0 rounded-lg border border-gray-100 px-4 py-4 dark:border-[#333]">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-3 dark:border-[#2a2a2a]">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fmtDate(rec.recordDate)}</span>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${rec.completionStatus === 'Completed' ? 'bg-green-100 text-green-700' : rec.completionStatus === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{rec.completionStatus ?? '—'}</span>
                          </div>
                          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                            {rec.educationLevel && (
                              <div className="min-w-0">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">Level</dt>
                                <dd className="mt-0.5 break-words font-medium text-gray-700 dark:text-gray-200">{rec.educationLevel}</dd>
                              </div>
                            )}
                            {rec.schoolName && (
                              <div className="min-w-0 sm:col-span-2">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">School</dt>
                                <dd className="mt-0.5 break-words font-medium text-gray-700 dark:text-gray-200">{rec.schoolName}</dd>
                              </div>
                            )}
                            {rec.enrollmentStatus && (
                              <div className="min-w-0">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">Enrollment</dt>
                                <dd className="mt-0.5 break-words font-medium text-gray-700 dark:text-gray-200">{rec.enrollmentStatus}</dd>
                              </div>
                            )}
                            {rec.attendanceRate != null && (
                              <div className="min-w-0">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">Attendance</dt>
                                <dd className="mt-0.5 font-medium text-gray-700 dark:text-gray-200">{rec.attendanceRate.toFixed(1)}%</dd>
                              </div>
                            )}
                            {rec.progressPercent != null && (
                              <div className="min-w-0">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">Progress</dt>
                                <dd className="mt-0.5 font-medium text-gray-700 dark:text-gray-200">{rec.progressPercent.toFixed(1)}%</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      ))
                  )}
                </div>
              )}
              {recordsPanel === 'health' && (
                <div className="w-full space-y-4">
                  {healthRecords.length === 0 ? (
                    <p className="text-sm text-gray-400">No health records found.</p>
                  ) : (
                    [...healthRecords]
                      .sort((a, b) => new Date(b.recordDate ?? 0).getTime() - new Date(a.recordDate ?? 0).getTime())
                      .map(rec => (
                        <div key={rec.healthRecordId} className="w-full min-w-0 rounded-lg border border-gray-100 px-4 py-4 dark:border-[#333]">
                          <div className="mb-4 border-b border-gray-50 pb-3 dark:border-[#2a2a2a]">
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{fmtDate(rec.recordDate)}</span>
                          </div>
                          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                            {rec.generalHealthScore != null && (
                              <div className="min-w-0">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">Health score</dt>
                                <dd className="mt-0.5 font-medium text-gray-700 dark:text-gray-200">{rec.generalHealthScore.toFixed(1)}</dd>
                              </div>
                            )}
                            {rec.nutritionScore != null && (
                              <div className="min-w-0">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">Nutrition</dt>
                                <dd className="mt-0.5 font-medium text-gray-700 dark:text-gray-200">{rec.nutritionScore.toFixed(1)}</dd>
                              </div>
                            )}
                            {rec.sleepQualityScore != null && (
                              <div className="min-w-0">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">Sleep quality</dt>
                                <dd className="mt-0.5 font-medium text-gray-700 dark:text-gray-200">{rec.sleepQualityScore.toFixed(1)}</dd>
                              </div>
                            )}
                            {rec.energyLevelScore != null && (
                              <div className="min-w-0">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">Energy level</dt>
                                <dd className="mt-0.5 font-medium text-gray-700 dark:text-gray-200">{rec.energyLevelScore.toFixed(1)}</dd>
                              </div>
                            )}
                            {(rec.heightCm != null || rec.weightKg != null) && (
                              <div className="min-w-0">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">Height / weight</dt>
                                <dd className="mt-0.5 break-words font-medium text-gray-700 dark:text-gray-200">
                                  {rec.heightCm != null ? `${rec.heightCm.toFixed(1)} cm` : '—'} / {rec.weightKg != null ? `${rec.weightKg.toFixed(1)} kg` : '—'}
                                </dd>
                              </div>
                            )}
                            {rec.bmi != null && (
                              <div className="min-w-0">
                                <dt className="text-xs text-gray-400 dark:text-gray-500">BMI</dt>
                                <dd className="mt-0.5 font-medium text-gray-700 dark:text-gray-200">{rec.bmi.toFixed(1)}</dd>
                              </div>
                            )}
                          </dl>
                          {(rec.medicalCheckupDone || rec.dentalCheckupDone || rec.psychologicalCheckupDone) && (
                            <div className="mt-4 border-t border-gray-50 pt-3 dark:border-[#2a2a2a]">
                              <p className="mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500">CHECKUPS</p>
                              <div className="flex flex-wrap gap-1.5">
                                {rec.medicalCheckupDone && <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">Medical</span>}
                                {rec.dentalCheckupDone && <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">Dental</span>}
                                {rec.psychologicalCheckupDone && <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">Psychological</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
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
