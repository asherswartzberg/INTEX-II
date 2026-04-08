import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import SettingsPanel from '../components/SettingsPanel'
import { fetchPublicImpactSummary } from '../apis/publicImpactApi'
import { getApiBaseUrl } from '../apis/client'
import type { Donation } from '../types/Donation'
import type { Supporter } from '../types/Supporter'
import type { PublicImpactSummaryDto } from '../types/apiDtos'

const SUPPORTER_TYPE_LABELS: Record<string, string> = {
  MonetaryDonor: 'Monetary Donor',
  InKindDonor: 'In-Kind Donor',
  Volunteer: 'Volunteer',
  SkillsContributor: 'Skills Contributor',
  SocialMediaAdvocate: 'Social Media Advocate',
  PartnerOrganization: 'Partner Organization',
}

function friendlyType(type: string | null) {
  return type ? SUPPORTER_TYPE_LABELS[type] ?? type : '—'
}

function fmtCurrency(amount: number | null, currency?: string | null) {
  if (amount == null) return '—'
  const sym = (currency ?? 'USD') === 'PHP' ? '₱' : '$'
  return sym + amount.toLocaleString('en', { maximumFractionDigits: 0 })
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Donate Form (separate component to keep things clean) ──────────────────
function DonateForm({ onSuccess }: { onSuccess: () => void }) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [campaign, setCampaign] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [notes, setNotes] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const presets = [25, 50, 100, 250]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const num = parseFloat(amount)
    if (!num || num <= 0) { setError('Enter a valid amount.'); return }
    if (!cardName || !cardNumber || !expiry || !cvv) { setError('Complete all payment fields.'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: num, currencyCode: currency, campaignName: campaign || null, isRecurring: recurring, notes: notes || null }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setError(d?.message || 'Donation failed.')
        return
      }
      setAmount(''); setCampaign(''); setRecurring(false); setNotes('')
      setCardName(''); setCardNumber(''); setExpiry(''); setCvv('')
      onSuccess()
    } catch { setError('Something went wrong.') }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 border border-red-200">{error}</div>}

      {/* Preset amounts */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.1em] text-medium-gray">Amount</label>
        <div className="flex gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                amount === String(p) ? 'border-black bg-black text-white' : 'border-border bg-white text-black hover:border-gray-400'
              }`}
            >
              ${p}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-medium-gray">$</span>
            <input
              type="number" step="0.01" min="1" placeholder="Other"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-border bg-off-white py-2.5 pl-7 pr-3 text-sm"
            />
          </div>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm">
            <option value="USD">USD</option>
            <option value="PHP">PHP</option>
            <option value="CLP">CLP</option>
          </select>
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-medium-gray">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 rounded border-border" />
          Monthly recurring
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-medium-gray">Campaign (optional)</label>
          <input placeholder="e.g., Holiday Giving" value={campaign} onChange={(e) => setCampaign(e.target.value)}
            className="w-full rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-medium-gray">Notes (optional)</label>
          <input placeholder="Any message" value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm" />
        </div>
      </div>

      {/* Payment */}
      <div className="border-t border-border pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-medium-gray">Payment details</p>
        <div className="space-y-3">
          <input placeholder="Name on card" value={cardName} onChange={(e) => setCardName(e.target.value)}
            className="w-full rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm" />
          <input placeholder="4242 4242 4242 4242" maxLength={19} value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
            className="w-full rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="MM/YY" maxLength={5} value={expiry} onChange={(e) => setExpiry(e.target.value)}
              className="w-full rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm" />
            <input placeholder="CVV" maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value)}
              className="w-full rounded-lg border border-border bg-off-white px-3 py-2.5 text-sm" />
          </div>
        </div>
      </div>

      <button type="submit" disabled={submitting}
        className="btn-wipe w-full rounded-lg bg-black py-3 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? 'Processing...' : `Donate${amount ? ` $${amount}` : ''}`}
      </button>
      <p className="text-center text-[11px] text-medium-gray">Simulated payment — no actual charge.</p>
    </form>
  )
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function DonorDashboard() {
  const { authSession } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [supporter, setSupporter] = useState<Supporter | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [impact, setImpact] = useState<PublicImpactSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDonate, setShowDonate] = useState(false)
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
      <header role="banner" className="flex items-center justify-between border-b border-border bg-white px-6 py-4 dark:bg-[#1a1a1a] dark:border-[#333]">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/Lighthouse.svg" alt="Faro Safehouse" className="h-7 w-7 object-contain" />
              <span className="text-xl font-normal text-black" style={{ fontFamily: "'EB Garamond', serif" }}>Faro Safehouse</span>
            </Link>
            <span className="text-sm italic text-medium-gray">Donor Portal</span>
            <span className="text-medium-gray">|</span>
            <span className="text-sm font-semibold text-black">{authSession.firstName || authSession.email}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-medium-gray hover:text-black transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Home
            </Link>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-medium-gray hover:text-black transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              Settings
            </button>
            <Link to="/logout" className="flex items-center gap-1.5 text-sm font-medium text-medium-gray hover:text-black transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Log out
            </Link>
          </div>
      </header>

      <main className="px-6 py-8">

        {/* ── Welcome + Donate CTA ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-medium-gray">Donor Portal</p>
            <h1 className="mt-1 text-2xl font-bold text-black">
              Welcome{authSession.firstName ? `, ${authSession.firstName}` : ''}
            </h1>
          </div>
          <button
            onClick={() => { setShowDonate(!showDonate); setSuccessMsg('') }}
            className="btn-wipe shrink-0 rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            {showDonate ? 'Close' : 'Make a Donation'}
          </button>
        </div>

        {/* ── Success message ── */}
        {successMsg && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm text-green-700">{successMsg}</div>
        )}

        {/* ── Donate form (slides open) ── */}
        {showDonate && (
          <div className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-5 text-lg font-bold text-black">Support Faro Safehouse</h2>
            <DonateForm onSuccess={() => {
              setSuccessMsg('Thank you! Your donation has been recorded.')
              setShowDonate(false)
              loadData()
            }} />
          </div>
        )}

        {/* ── Stats ── */}
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total giving" value={fmtCurrency(totalDonated)} />
          <StatCard label="Donations" value={String(donations.length)} />
          <StatCard label="Safehouses" value={String(impact?.safehouseCount ?? '—')} />
          <StatCard label="Residents served" value={String(impact?.activeResidentsCount ?? '—')} />
        </div>

        {/* ── Two columns ── */}
        <div className="mt-10 grid gap-8 lg:grid-cols-3">

          {/* Left: Donation history (takes 2 cols) */}
          <div className="lg:col-span-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-medium-gray">Donation History</h2>

            {!authSession.supporterId ? (
              <div className="mt-3 rounded-xl border border-border bg-white px-6 py-10 text-center">
                <p className="text-sm text-medium-gray">Account not linked to a donor profile. Contact us to connect.</p>
              </div>
            ) : sortedDonations.length === 0 ? (
              <div className="mt-3 rounded-xl border border-border bg-white px-6 py-10 text-center">
                <p className="text-sm text-medium-gray">No donations yet. Make your first one above!</p>
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-white">
                {/* Table header */}
                <div className="grid grid-cols-4 gap-4 border-b border-border bg-off-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-medium-gray">
                  <span>Date</span>
                  <span>Type</span>
                  <span>Campaign</span>
                  <span className="text-right">Amount</span>
                </div>
                {/* Rows */}
                {sortedDonations.map((d) => (
                  <div key={d.donationId} className="grid grid-cols-4 gap-4 border-b border-border px-5 py-3 last:border-0 text-sm">
                    <span className="text-medium-gray">{fmtDate(d.donationDate)}</span>
                    <span className="text-black">
                      {d.donationType ?? 'Donation'}
                      {d.isRecurring && <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">Recurring</span>}
                    </span>
                    <span className="text-medium-gray">{d.campaignName ?? '—'}</span>
                    <span className="text-right font-semibold text-black">{fmtCurrency(d.amount ?? d.estimatedValue, d.currencyCode)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-5">
            {/* Profile card */}
            {supporter && (
              <div className="rounded-xl border border-border bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-medium-gray">Your Profile</p>
                <div className="mt-3 space-y-2.5 text-sm">
                  <SidebarRow label="Name" value={supporter.displayName ?? [supporter.firstName, supporter.lastName].filter(Boolean).join(' ') ?? '—'} />
                  <SidebarRow label="Type" value={friendlyType(supporter.supporterType)} />
                  <SidebarRow label="Status" value={supporter.status ?? '—'} />
                  <SidebarRow label="Since" value={fmtDate(supporter.createdAt)} />
                </div>
              </div>
            )}

            {/* Impact updates */}
            {impact?.latestPublishedSnapshots && impact.latestPublishedSnapshots.length > 0 && (
              <div className="rounded-xl border border-border bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-medium-gray">Impact Updates</p>
                <div className="mt-3 space-y-2">
                  {impact.latestPublishedSnapshots.slice(0, 5).map((snap) => (
                    <ImpactUpdateCard key={snap.snapshotId} snap={snap} />
                  ))}
                </div>
              </div>
            )}

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

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-medium-gray">{label}</span>
      <span className="font-medium text-black">{value}</span>
    </div>
  )
}
