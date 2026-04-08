import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import SettingsPanel from '../components/SettingsPanel'
import { fetchPublicImpactSummary } from '../apis/publicImpactApi'
import { getApiBaseUrl } from '../apis/client'
import type { Donation } from '../types/Donation'
import type { Supporter } from '../types/Supporter'
import type { PublicImpactSummaryDto } from '../types/apiDtos'


function fmtCurrency(amount: number | null, currency?: string | null) {
  if (amount == null) return '—'
  const sym = (currency ?? 'USD') === 'PHP' ? '₱' : '$'
  return sym + amount.toLocaleString('en', { maximumFractionDigits: 0 })
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Donate Section ──────────────────────────────────────────────────────────
function DonateSection({ onRecordSuccess }: { onRecordSuccess: () => void }) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [donationType, setDonationType] = useState('Monetary')
  const [campaign, setCampaign] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [recorded, setRecorded] = useState(false)

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const num = parseFloat(amount)
    if (!num || num <= 0) { setError('Enter a valid amount.'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: num, currencyCode: currency, donationType, campaignName: campaign || null, isRecurring: recurring, notes: null }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setError(d?.message || 'Failed to record.')
        return
      }
      setAmount(''); setCampaign(''); setRecurring(false)
      setRecorded(true)
      onRecordSuccess()
    } catch { setError('Something went wrong.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <p className="mb-1 text-sm font-semibold text-black">Record a Donation</p>
      <p className="mb-4 text-xs text-medium-gray">
        Log your donation so it appears in your history.
      </p>

          {recorded && (
            <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
              Donation recorded successfully!
            </div>
          )}
          {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 border border-red-200">{error}</div>}

          <form onSubmit={handleRecord} aria-label="Record a donation" className="space-y-3">
            <div>
              <label htmlFor="donate-amount" className="mb-1 block text-xs font-medium text-medium-gray">Amount</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-medium-gray" aria-hidden="true">$</span>
                  <input
                    id="donate-amount"
                    type="number" step="0.01" min="1" placeholder="0.00"
                    value={amount} onChange={(e) => { setAmount(e.target.value); setRecorded(false) }}
                    className="w-full rounded-lg border border-border bg-white py-2.5 pl-7 pr-3 text-sm"
                  />
                </div>
                <label htmlFor="donate-currency" className="sr-only">Currency</label>
                <select id="donate-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm">
                  <option value="USD">USD</option>
                  <option value="PHP">PHP</option>
                  <option value="CLP">CLP</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="donate-type" className="mb-1 block text-xs font-medium text-medium-gray">Donation type</label>
              <select id="donate-type" value={donationType} onChange={(e) => setDonationType(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm">
                <option value="Monetary">Monetary</option>
                <option value="InKind">In-Kind (goods, supplies)</option>
                <option value="Time">Time (volunteering)</option>
                <option value="Skills">Skills</option>
                <option value="SocialMedia">Social Media Advocacy</option>
              </select>
            </div>
            <div>
              <label htmlFor="donate-campaign" className="mb-1 block text-xs font-medium text-medium-gray">Campaign (optional)</label>
              <select id="donate-campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm">
                <option value="">None</option>
                <option value="Year-End Hope">Year-End Hope</option>
                <option value="Back to School">Back to School</option>
                <option value="Summer of Safety">Summer of Safety</option>
                <option value="GivingTuesday">GivingTuesday</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-medium-gray">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 rounded border-border" />
              Monthly recurring
            </label>
            <button type="submit" disabled={submitting}
              className="btn-wipe w-full rounded-lg bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? 'Recording...' : 'Record Donation'}
            </button>
          </form>
    </div>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function DonorDashboard() {
  const { authSession } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, setSupporter] = useState<Supporter | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [allocations, setAllocations] = useState<{ allocationId: number; donationId: number; programArea: string }[]>([])
  const [impact, setImpact] = useState<PublicImpactSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [impactData, profileRes] = await Promise.all([
        fetchPublicImpactSummary(),
        fetch(`${getApiBaseUrl()}/api/auth/my-profile`, { credentials: 'include' }),
      ])
      setImpact(impactData)
      if (profileRes.ok) {
        const profile = await profileRes.json()
        if (profile.supporter) setSupporter(profile.supporter)
        if (profile.donations) setDonations(profile.donations)
        if (profile.allocations) setAllocations(profile.allocations)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const totalDonated = donations.reduce((sum, d) => sum + (d.amount ?? d.estimatedValue ?? 0), 0)
  const sortedDonations = [...donations].sort((a, b) =>
    new Date(b.donationDate ?? 0).getTime() - new Date(a.donationDate ?? 0).getTime()
  )

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
    </div>
  )

  return (
    <>
    <div data-donor className="min-h-screen bg-off-white dark:bg-[#111] dark:text-[#e5e5e5]">
      {/* ── Header ── */}
      <header role="banner" className="sticky top-0 z-30 grid grid-cols-3 items-center border-b border-border bg-white px-6 py-4 dark:bg-[#1a1a1a] dark:border-[#333]">

        {/* Left: portal name + user */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm italic text-medium-gray">Donor Portal</span>
          <span className="hidden text-medium-gray md:inline">|</span>
          <span className="hidden text-sm font-semibold text-black md:inline">{authSession.firstName || authSession.email}</span>
        </div>

        {/* Center: logo + wordmark */}
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/Lighthouse.svg" alt="Faro Safehouse" className="h-7 w-7 object-contain" />
            <span className="hidden text-xl font-normal text-black sm:inline" style={{ fontFamily: "'EB Garamond', serif" }}>Faro Safehouse</span>
          </Link>
        </div>

        {/* Right: nav actions */}
        <div className="flex items-center justify-end gap-5 md:gap-6">
          <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-medium-gray hover:text-black transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="hidden sm:inline">Home</span>
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-medium-gray hover:text-black transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <span className="hidden sm:inline">Settings</span>
          </button>
          <Link to="/logout" className="flex items-center gap-1.5 text-sm font-medium text-medium-gray hover:text-black transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="hidden sm:inline">Log out</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">

        {/* ── Welcome ── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-medium-gray">Donor Portal</p>
          <h1 className="mt-1 text-2xl font-bold text-black">
            Welcome{authSession.firstName ? `, ${authSession.firstName}` : ''}
          </h1>
        </div>

        {/* ── Success message ── */}
        {successMsg && (
          <div role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm text-green-700">{successMsg}</div>
        )}

        {/* ── Stats ── */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatCard label="Total giving" value={fmtCurrency(totalDonated)} />
          <StatCard label="Donations" value={String(donations.length)} />
        </div>

        {/* ── Two columns: left 2/3 (impact + history), right 1/3 (donate) ── */}
        {/* On mobile: donate first, then impact, then history */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">

          {/* Left: Impact updates + Donation history */}
          <div className="order-2 lg:order-1 lg:col-span-2 space-y-8">
            {/* Allocation breakdown */}
            {allocations.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-medium-gray">Where Your Money Goes</h2>
                <div className="mt-3 rounded-xl border border-border bg-white p-5">
                  <div className="space-y-3">
                    {(() => {
                      const totals: Record<string, number> = {}
                      allocations.forEach(a => {
                        const area = a.programArea ?? 'Other'
                        const donation = donations.find(d => d.donationId === a.donationId)
                        totals[area] = (totals[area] ?? 0) + (donation?.amount ?? donation?.estimatedValue ?? 0)
                      })
                      const max = Math.max(...Object.values(totals), 1)
                      return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([area, amount]) => (
                        <div key={area}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-black">{area}</span>
                            <span className="text-medium-gray">{fmtCurrency(amount)}</span>
                          </div>
                          <div className="mt-1 h-2 w-full rounded-full bg-off-white">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(amount / max) * 100}%` }} />
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Impact updates */}
            {impact?.latestPublishedSnapshots && impact.latestPublishedSnapshots.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-medium-gray">Impact Updates</h2>
                <div className="mt-3 space-y-2 rounded-xl border border-border bg-white p-5">
                  {impact.latestPublishedSnapshots.slice(0, 5).map((snap) => (
                    <ImpactUpdateCard key={snap.snapshotId} snap={snap} />
                  ))}
                </div>
              </div>
            )}

            {/* Donation history */}
            <div>
              <h2 id="donation-history-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-medium-gray">Donation History</h2>
              {!authSession.supporterId ? (
                <div className="mt-3 rounded-xl border border-border bg-white px-6 py-10 text-center">
                  <p className="text-sm text-medium-gray">Account not linked to a donor profile. Contact us to connect.</p>
                </div>
              ) : sortedDonations.length === 0 ? (
                <div className="mt-3 rounded-xl border border-border bg-white px-6 py-10 text-center">
                  <p className="text-sm text-medium-gray">No donations yet — use the form to make your first!</p>
                </div>
              ) : (
                <div className="mt-3 overflow-hidden rounded-xl border border-border bg-white">
                  <div className="grid grid-cols-3 gap-3 border-b border-border bg-off-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-medium-gray sm:grid-cols-5 sm:gap-4 sm:px-5">
                    <span>Date</span>
                    <span>Type</span>
                    <span className="hidden sm:block">Campaign</span>
                    <span className="hidden sm:block">Allocated to</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {sortedDonations.map((d) => {
                    const alloc = allocations.find(a => a.donationId === d.donationId)
                    return (
                    <div key={d.donationId} className="grid grid-cols-3 gap-3 border-b border-border px-4 py-3 last:border-0 text-sm sm:grid-cols-5 sm:gap-4 sm:px-5">
                      <span className="text-medium-gray">{fmtDate(d.donationDate)}</span>
                      <span className="text-black">
                        {d.donationType ?? 'Donation'}
                        {d.isRecurring && <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">Recurring</span>}
                      </span>
                      <span className="hidden text-medium-gray sm:block">{d.campaignName ?? '—'}</span>
                      <span className="hidden sm:block">
                        {alloc ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{alloc.programArea}</span> : <span className="text-medium-gray">—</span>}
                      </span>
                      <span className="text-right font-semibold text-black">{fmtCurrency(d.amount ?? d.estimatedValue, d.currencyCode)}</span>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Donate tools (shows first on mobile) */}
          <div className="order-1 lg:order-2 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-medium-gray">Support Faro Safehouse</h2>

            {/* Givebutter iframe */}
            <div className="flex flex-col items-center rounded-xl border border-border bg-white p-4">
              <iframe
                name="givebutter"
                title="Donate to Faro Safehouse"
                allow="payment"
                className="w-full rounded-xl border border-border bg-white"
                style={{ maxWidth: 440, height: 439, overflow: 'hidden' as const }}
                src="https://givebutter.com/embed/c/ozvC2F?goalBar=false&gba_gb.element.id=jN24wj"
              />
              <p className="mt-3 text-center text-xs text-medium-gray">or donate with:</p>
              <div className="mt-2 flex items-center justify-center gap-6">
                <a href="https://venmo.com/u/Lighthouse_Sanctuary" target="_blank" rel="noopener noreferrer" className="block h-[70px] w-[70px] overflow-hidden rounded-xl transition-opacity hover:opacity-70">
                  <img src="https://lighthousesanctuary.org/wp-content/uploads/2025/11/Venmo-2-1-300x288.png" alt="Donate via Venmo" className="h-full w-full object-cover" />
                </a>
                <a href="https://www.paypal.com/paypalme/LighthouseSanctuary" target="_blank" rel="noopener noreferrer" className="block h-[70px] w-[70px] overflow-hidden rounded-xl transition-opacity hover:opacity-70">
                  <img src="https://lighthousesanctuary.org/wp-content/uploads/2025/11/PayPal.png" alt="Donate via PayPal" className="h-full w-full object-contain" />
                </a>
              </div>
            </div>

            {/* Record donation */}
            <DonateSection onRecordSuccess={() => {
              setSuccessMsg('Donation recorded in your history.')
              loadData()
            }} />
          </div>
        </div>
      </main>
    </div>

    <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

function ImpactUpdateCard({ snap }: { snap: { snapshotId: number; snapshotDate: string | null; headline: string | null; summaryText: string | null } }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="w-full text-left border-l-2 border-black pl-3 transition-colors hover:border-medium-gray"
    >
      <p className="text-sm font-medium text-black">{snap.headline ?? 'Update'}</p>
      <p className="text-xs text-medium-gray">{fmtDate(snap.snapshotDate)}</p>
      {open && snap.summaryText && (
        <p className="mt-2 text-xs leading-relaxed text-medium-gray">{snap.summaryText}</p>
      )}
    </button>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-medium-gray">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-black">{value}</p>
    </div>
  )
}

