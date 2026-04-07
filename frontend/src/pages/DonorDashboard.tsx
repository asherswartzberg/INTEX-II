import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { fetchPublicImpactSummary } from '../apis/publicImpactApi'
import { fetchDonationsForSupporter } from '../apis/supportersApi'
import { fetchSupporterById } from '../apis/supportersApi'
import type { Donation } from '../types/Donation'
import type { Supporter } from '../types/Supporter'
import type { PublicImpactSummaryDto } from '../types/apiDtos'

function fmtCurrency(amount: number | null, currency?: string | null) {
  if (amount == null) return '—'
  const sym = (currency ?? 'PHP') === 'PHP' ? '₱' : '$'
  return sym + amount.toLocaleString('en', { maximumFractionDigits: 0 })
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DonorDashboard() {
  const { authSession } = useAuth()
  const [supporter, setSupporter] = useState<Supporter | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [impact, setImpact] = useState<PublicImpactSummaryDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch public impact data (no auth needed)
        const impactData = await fetchPublicImpactSummary()
        setImpact(impactData)

        // If donor has a linked supporter ID, fetch their data
        if (authSession.supporterId) {
          const [sup, don] = await Promise.all([
            fetchSupporterById(authSession.supporterId),
            fetchDonationsForSupporter(authSession.supporterId),
          ])
          setSupporter(sup)
          setDonations(don)
        }
      } catch (err) {
        console.error('Failed to load donor data', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [authSession.supporterId])

  const totalDonated = donations.reduce((sum, d) => sum + (d.amount ?? d.estimatedValue ?? 0), 0)
  const donationCount = donations.length
  const sortedDonations = [...donations].sort((a, b) =>
    new Date(b.donationDate ?? 0).getTime() - new Date(a.donationDate ?? 0).getTime()
  )

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-off-white">
      {/* Header */}
      <header className="border-b border-border bg-white px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-2xl text-black" style={{ fontFamily: "'EB Garamond', serif" }}>
              Faro Safehouse
            </Link>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">Donor</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-medium-gray">{authSession.email}</span>
            <Link to="/logout" className="text-sm font-medium text-medium-gray hover:text-black transition-colors">
              Log out
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        {/* Welcome */}
        <h1 className="text-2xl font-bold text-black">
          Welcome back{authSession.firstName ? `, ${authSession.firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-medium-gray">
          Thank you for supporting Faro Safehouse. Here's how your generosity is making an impact.
        </p>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Your total giving" value={fmtCurrency(totalDonated)} />
          <StatCard label="Donations made" value={String(donationCount)} />
          <StatCard
            label="Active safehouses"
            value={String(impact?.safehouseCount ?? '—')}
          />
          <StatCard
            label="Residents served"
            value={String(impact?.activeResidentsCount ?? '—')}
          />
        </div>

        {/* Two columns: donation history + impact */}
        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          {/* Donation history */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">
              Your donation history
            </h2>

            {!authSession.supporterId ? (
              <div className="mt-4 rounded-xl border border-border bg-white px-6 py-10 text-center">
                <p className="text-sm text-medium-gray">
                  Your account is not yet linked to a donor profile. Please contact us to connect your account.
                </p>
              </div>
            ) : sortedDonations.length === 0 ? (
              <div className="mt-4 rounded-xl border border-border bg-white px-6 py-10 text-center">
                <p className="text-sm text-medium-gray">No donations found yet.</p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-white">
                {sortedDonations.map((d) => (
                  <div key={d.donationId} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-black">
                        {d.donationType ?? 'Donation'}
                        {d.campaignName && <span className="text-medium-gray"> · {d.campaignName}</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-medium-gray">
                        {fmtDate(d.donationDate)}
                        {d.isRecurring && <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">Recurring</span>}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-black">
                      {fmtCurrency(d.amount ?? d.estimatedValue, d.currencyCode)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Impact sidebar */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-medium-gray">
              Organization impact
            </h2>

            <div className="mt-4 space-y-4">
              {/* Donor profile card */}
              {supporter && (
                <div className="rounded-xl border border-border bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-medium-gray">Your profile</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <Row label="Name" value={supporter.displayName ?? [supporter.firstName, supporter.lastName].filter(Boolean).join(' ') ?? '—'} />
                    <Row label="Type" value={supporter.supporterType ?? '—'} />
                    <Row label="Status" value={supporter.status ?? '—'} />
                    <Row label="Member since" value={fmtDate(supporter.createdAt)} />
                  </div>
                </div>
              )}

              {/* Impact snapshots */}
              {impact?.latestPublishedSnapshots && impact.latestPublishedSnapshots.length > 0 && (
                <div className="rounded-xl border border-border bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-medium-gray">Latest impact updates</p>
                  <div className="mt-3 space-y-3">
                    {impact.latestPublishedSnapshots.slice(0, 3).map((snap) => (
                      <div key={snap.snapshotId} className="border-l-2 border-black pl-3">
                        <p className="text-sm font-medium text-black">{snap.headline ?? 'Impact update'}</p>
                        <p className="mt-0.5 text-xs text-medium-gray">{fmtDate(snap.snapshotDate)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick message */}
              <div className="rounded-xl bg-black p-5 text-white">
                <p className="text-sm font-semibold">Your impact matters</p>
                <p className="mt-2 text-xs leading-relaxed text-white/60">
                  Every contribution helps provide safe homes, counseling, education,
                  and a path to recovery for survivors. Thank you for being part of
                  the Faro Safehouse family.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-medium-gray">{label}</p>
      <p className="mt-1 text-2xl font-bold text-black">{value}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-medium-gray">{label}</span>
      <span className="font-medium text-black">{value}</span>
    </div>
  )
}
