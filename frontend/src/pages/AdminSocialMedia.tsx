import { useEffect, useState, useMemo } from 'react'
import { fetchSocialMediaPosts } from '../apis/socialMediaPostsApi'
import { fetchSocialMediaRecommendations } from '../apis/socialMediaRecommendationsApi'
import type { SocialMediaPost } from '../types/SocialMediaPost'
import type { SocialMediaRecommendation } from '../types/SocialMediaRecommendation'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtNum(n: number | null) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Platform brand config ──────────────────────────────────────────────────

const PLATFORM_BRAND: Record<string, { hex: string; textClass: string }> = {
  Facebook:  { hex: '#2563eb', textClass: 'text-blue-600 dark:text-blue-400'  },
  Instagram: { hex: '#ec4899', textClass: 'text-pink-500 dark:text-pink-400'  },
  Twitter:   { hex: '#0ea5e9', textClass: 'text-sky-500 dark:text-sky-400'    },
  YouTube:   { hex: '#dc2626', textClass: 'text-red-600 dark:text-red-400'    },
  TikTok:    { hex: '#374151', textClass: 'text-gray-800 dark:text-gray-200'  },
  LinkedIn:  { hex: '#1d4ed8', textClass: 'text-blue-700 dark:text-blue-400'  },
  WhatsApp:  { hex: '#25d366', textClass: 'text-green-500 dark:text-green-400' },
}

// ── Platform SVG icons (inline, brand-accurate) ────────────────────────────

function PlatformIcon({ platform, className = 'w-5 h-5' }: { platform: string; className?: string }) {
  switch (platform) {
    case 'Facebook':
      return (
        <svg viewBox="0 0 24 24" className={`fill-current ${className}`} aria-label="Facebook">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      )
    case 'Instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-label="Instagram">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      )
    case 'Twitter':
      return (
        <svg viewBox="0 0 24 24" className={`fill-current ${className}`} aria-label="X / Twitter">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case 'YouTube':
      return (
        <svg viewBox="0 0 24 24" className={`fill-current ${className}`} aria-label="YouTube">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      )
    case 'TikTok':
      return (
        <svg viewBox="0 0 24 24" className={`fill-current ${className}`} aria-label="TikTok">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.22 8.22 0 0 0 4.81 1.54V6.78a4.85 4.85 0 0 1-1.04-.09z" />
        </svg>
      )
    case 'LinkedIn':
      return (
        <svg viewBox="0 0 24 24" className={`fill-current ${className}`} aria-label="LinkedIn">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      )
    case 'WhatsApp':
      return (
        <svg viewBox="0 0 24 24" className={`fill-current ${className}`} aria-label="WhatsApp">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.096.539 4.064 1.481 5.777L0 24l6.396-1.458A11.942 11.942 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.854 0-3.6-.5-5.1-1.374l-.364-.216-3.8.866.9-3.696-.238-.38A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )
  }
}

// ── Sparkline ──────────────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-6 w-16" />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 0.001
  const W = 64
  const H = 24
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - 2 - ((v - min) / range) * (H - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={W} height={H} className="overflow-visible" aria-hidden="true">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  )
}

// ── Widget wrapper ─────────────────────────────────────────────────────────

function Widget({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-50 px-5 py-3.5 dark:border-[#333]">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Heatmap constants ──────────────────────────────────────────────────────

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_MAP: Record<string, number> = {
  Monday: 0, Mon: 0, Tuesday: 1, Tue: 1, Wednesday: 2, Wed: 2,
  Thursday: 3, Thu: 3, Friday: 4, Fri: 4, Saturday: 5, Sat: 5, Sunday: 6, Sun: 6,
}
const HOUR_BUCKET_LABELS = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p']

// Tailwind bg classes (no inline styles — class-based colors survive dark mode filters)
const TOPIC_BG = [
  'bg-indigo-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500', 'bg-blue-500',
  'bg-violet-500', 'bg-red-500', 'bg-teal-500', 'bg-orange-500', 'bg-lime-500',
]

function heatClass(intensity: number): string {
  if (intensity === 0) return 'bg-gray-100 dark:bg-[#252525]'
  if (intensity < 0.2)  return 'bg-emerald-100 dark:bg-emerald-900'
  if (intensity < 0.4)  return 'bg-emerald-200 dark:bg-emerald-700'
  if (intensity < 0.6)  return 'bg-emerald-400 dark:bg-emerald-500'
  if (intensity < 0.8)  return 'bg-emerald-500 dark:bg-emerald-400'
  return                       'bg-emerald-600 dark:bg-emerald-300'
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AdminSocialMedia() {
  const [posts, setPosts] = useState<SocialMediaPost[]>([])
  const [todayRec, setTodayRec] = useState<SocialMediaRecommendation | null>(null)
  const [topRecs, setTopRecs] = useState<SocialMediaRecommendation[]>([])
  const [platformRecsMap, setPlatformRecsMap] = useState<Record<string, SocialMediaRecommendation[]>>({})
  const [explorePlatform, setExplorePlatform] = useState<string | null>(null)
  const [recLoading, setRecLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState('All')
  const [sortBy, setSortBy] = useState<'engagementRate' | 'reach' | 'donationReferrals'>('engagementRate')
  const [heatMetric, setHeatMetric] = useState<'engagement' | 'referrals'>('engagement')
  const [kpiMode, setKpiMode] = useState<'donation' | 'engagement' | 'reach'>('donation')

  useEffect(() => {
    fetchSocialMediaPosts({ pageSize: 900 })
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])


  const TODAY = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }), [])

  const KNOWN_PLATFORMS = ['Facebook', 'Instagram', 'Twitter', 'YouTube', 'TikTok', 'LinkedIn', 'WhatsApp']

  useEffect(() => {
    setRecLoading(true)
    Promise.all([
      fetchSocialMediaRecommendations({ dayOfWeek: TODAY, top: 1 }),
      fetchSocialMediaRecommendations({ top: 6 }),
      ...KNOWN_PLATFORMS.map(p => fetchSocialMediaRecommendations({ platform: p, top: 3 })),
    ])
      .then(([todayData, topData, ...perPlatform]) => {
        setTodayRec(todayData[0] ?? null)
        setTopRecs(topData)
        const map: Record<string, SocialMediaRecommendation[]> = {}
        KNOWN_PLATFORMS.forEach((p, i) => { map[p] = perPlatform[i] })
        setPlatformRecsMap(map)
      })
      .catch(console.error)
      .finally(() => setRecLoading(false))
  }, [TODAY])

  const displayRecs = useMemo(() => {
    if (explorePlatform) return platformRecsMap[explorePlatform] ?? []
    return topRecs
  }, [topRecs, explorePlatform, platformRecsMap])

  const filtered = useMemo(() =>
    platformFilter === 'All' ? posts : posts.filter((p) => p.platform === platformFilter),
    [posts, platformFilter]
  )

  // ── KPI aggregates ───────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const totalReach = posts.reduce((s, p) => s + (p.reach ?? 0), 0)
    const totalImpressions = posts.reduce((s, p) => s + (p.impressions ?? 0), 0)
    const totalReferrals = posts.reduce((s, p) => s + (p.donationReferrals ?? 0), 0)
    const totalEstValue = posts.reduce((s, p) => s + (p.estimatedDonationValuePhp ?? 0), 0)
    const engRates = posts.map(p => p.engagementRate).filter((v): v is number => v != null)
    const avgEng = engRates.length ? engRates.reduce((a, b) => a + b, 0) / engRates.length : 0
    const byReferrals: Record<string, number> = {}
    const byEngagement: Record<string, number[]> = {}
    const byReach: Record<string, number> = {}
    posts.forEach(p => {
      if (!p.platform) return
      byReferrals[p.platform] = (byReferrals[p.platform] ?? 0) + (p.donationReferrals ?? 0)
      if (p.engagementRate != null) { if (!byEngagement[p.platform]) byEngagement[p.platform] = []; byEngagement[p.platform].push(p.engagementRate) }
      byReach[p.platform] = (byReach[p.platform] ?? 0) + (p.reach ?? 0)
    })
    const bestByReferrals = Object.entries(byReferrals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    const bestByEngagement = Object.entries(byEngagement).map(([pl, rates]) => [pl, rates.reduce((a, b) => a + b, 0) / rates.length] as [string, number]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    const bestByReach = Object.entries(byReach).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    const totalInteractions = posts.reduce((s, p) => s + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0), 0)
    return { totalReach, totalImpressions, totalReferrals, totalEstValue, avgEng, bestByReferrals, bestByEngagement, bestByReach, totalInteractions }
  }, [posts])

  // ── Per-platform stats with sparklines ───────────────────────────────────

  const platformStats = useMemo(() => {
    const map: Record<string, {
      count: number; reach: number; engRates: number[]
      referrals: number; recentEng: { date: string; rate: number }[]
    }> = {}
    posts.forEach((p) => {
      const pl = p.platform ?? 'Unknown'
      if (!map[pl]) map[pl] = { count: 0, reach: 0, engRates: [], referrals: 0, recentEng: [] }
      map[pl].count++
      map[pl].reach += p.reach ?? 0
      if (p.engagementRate != null) {
        map[pl].engRates.push(p.engagementRate)
        map[pl].recentEng.push({ date: p.createdAt ?? '', rate: p.engagementRate })
      }
      map[pl].referrals += p.donationReferrals ?? 0
    })
    return Object.entries(map).map(([platform, d]) => {
      const sorted = [...d.recentEng].sort((a, b) => a.date.localeCompare(b.date)).slice(-10)
      return {
        platform,
        count: d.count,
        reach: d.reach,
        avgEngRate: d.engRates.length ? d.engRates.reduce((a, b) => a + b, 0) / d.engRates.length : 0,
        referrals: d.referrals,
        sparkline: sorted.map(x => x.rate),
      }
    }).sort((a, b) => b.reach - a.reach)
  }, [posts])

  // ── Heatmap (day × 2-hour bucket) ────────────────────────────────────────

  const heatmapData = useMemo(() => {
    const map: Record<string, { engSum: number; refSum: number; count: number }> = {}
    const DOW_FALLBACK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    posts.forEach(p => {
      const rawDay = p.dayOfWeek?.trim() ?? (p.createdAt ? DOW_FALLBACK[new Date(p.createdAt).getDay()] : null)
      const dayIdx = rawDay != null ? DAY_MAP[rawDay] : undefined
      const hour = p.postHour ?? (p.createdAt ? new Date(p.createdAt).getHours() : null)
      if (dayIdx == null || hour == null) return
      const bucket = Math.floor(hour / 2)
      const key = `${dayIdx}-${bucket}`
      if (!map[key]) map[key] = { engSum: 0, refSum: 0, count: 0 }
      map[key].count++
      map[key].engSum += p.engagementRate ?? 0
      map[key].refSum += p.donationReferrals ?? 0
    })
    let maxEng = 0, maxRef = 0
    Object.values(map).forEach(v => {
      if (v.count > 0) {
        maxEng = Math.max(maxEng, v.engSum / v.count)
        maxRef = Math.max(maxRef, v.refSum / v.count)
      }
    })
    return { map, maxEng: maxEng || 1, maxRef: maxRef || 1 }
  }, [posts])

  // ── Content mix ──────────────────────────────────────────────────────────

  const contentMix = useMemo(() => {
    const counts: Record<string, { posts: number; engSum: number }> = {}
    filtered.forEach(p => {
      const t = p.contentTopic ?? 'Other'
      if (!counts[t]) counts[t] = { posts: 0, engSum: 0 }
      counts[t].posts++
      counts[t].engSum += p.engagementRate ?? 0
    })
    const total = Object.values(counts).reduce((s, v) => s + v.posts, 0)
    return Object.entries(counts)
      .map(([topic, d]) => ({ topic, posts: d.posts, avgEng: d.posts > 0 ? d.engSum / d.posts : 0, pct: total > 0 ? (d.posts / total) * 100 : 0 }))
      .sort((a, b) => b.posts - a.posts)
  }, [filtered])

  // ── Top posts ─────────────────────────────────────────────────────────────

  const topPosts = useMemo(() =>
    [...filtered].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0)).slice(0, 15),
    [filtered, sortBy]
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-off-white dark:bg-[#111] px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Media Analytics</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          Performance across all platforms{posts.length > 0 ? ` · ${posts.length} posts tracked` : ''}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white dark:bg-[#1a1a1a]" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-sm text-gray-400">
          No social media data found.
        </div>
      ) : (
        <>
          {/* ── KPI strip ─────────────────────────────────────────────────── */}
          <div className="mb-3 flex gap-1">
            {([['donation', 'Donations'], ['engagement', 'Engagement'], ['reach', 'Reach']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setKpiMode(mode)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  kpiMode === mode
                    ? 'bg-gray-900 text-white dark:!bg-white dark:!text-black shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpiMode === 'donation' && <>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.totalReferrals.toLocaleString()}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Donation Referrals</p>
                <p className="text-[10px] text-gray-400">total from social media</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${fmtNum(kpis.totalEstValue)}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Est. Donation Value</p>
                <p className="text-[10px] text-gray-400">from referrals (PHP)</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className={`text-2xl font-bold ${PLATFORM_BRAND[kpis.bestByReferrals]?.textClass ?? 'text-gray-900 dark:text-white'}`}>{kpis.bestByReferrals}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Best Platform</p>
                <p className="text-[10px] text-gray-400">by donation referrals</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {kpis.totalReferrals > 0 ? (kpis.totalReferrals / posts.length).toFixed(1) : '0'}
                </p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Avg Referrals / Post</p>
                <p className="text-[10px] text-gray-400">across all tracked posts</p>
              </div>
            </>}
            {kpiMode === 'engagement' && <>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(kpis.avgEng * 100).toFixed(1)}%</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Avg Engagement Rate</p>
                <p className="text-[10px] text-gray-400">across all posts</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{posts.length}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Total Posts</p>
                <p className="text-[10px] text-gray-400">tracked across platforms</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className={`text-2xl font-bold ${PLATFORM_BRAND[kpis.bestByEngagement]?.textClass ?? 'text-gray-900 dark:text-white'}`}>{kpis.bestByEngagement}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Best Platform</p>
                <p className="text-[10px] text-gray-400">by avg engagement rate</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{fmtNum(kpis.totalInteractions)}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Total Interactions</p>
                <p className="text-[10px] text-gray-400">likes + comments + shares</p>
              </div>
            </>}
            {kpiMode === 'reach' && <>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{fmtNum(kpis.totalReach)}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Total Reach</p>
                <p className="text-[10px] text-gray-400">unique accounts reached</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{fmtNum(kpis.totalImpressions)}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Total Impressions</p>
                <p className="text-[10px] text-gray-400">across all posts</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className={`text-2xl font-bold ${PLATFORM_BRAND[kpis.bestByReach]?.textClass ?? 'text-gray-900 dark:text-white'}`}>{kpis.bestByReach}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Best Platform</p>
                <p className="text-[10px] text-gray-400">by total reach</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {posts.length > 0 ? fmtNum(Math.round(kpis.totalReach / posts.length)) : '—'}
                </p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Avg Reach / Post</p>
                <p className="text-[10px] text-gray-400">across all tracked posts</p>
              </div>
            </>}
          </div>

          {/* ── AI Posting Recommendations ───────────────────────────────── */}
          <div className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm dark:bg-[#1a1a1a] dark:border-[#333]">
            <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5 dark:border-[#333]">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white">What to Post</h2>
                <p className="mt-0.5 text-[11px] text-gray-400">ranked by highest predicted donation referrals</p>
              </div>
            </div>
            <div className="p-5">
              {recLoading ? (
                <div className="space-y-4">
                  <div className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-[#222]" />
                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-[#222]" />)}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* ── Hero: Best post for today ── */}
                  {todayRec && (() => {
                    const brand = PLATFORM_BRAND[todayRec.platform ?? '']
                    return (
                      <div className="overflow-hidden rounded-xl border-2" style={{ borderColor: brand?.hex ?? '#374151' }}>
                        <div className="flex items-center gap-4 px-5 py-4" style={{ backgroundColor: brand?.hex ?? '#374151' }}>
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
                            <PlatformIcon platform={todayRec.platform ?? ''} className="h-6 w-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Best post for {TODAY}</p>
                            <p className="text-base font-bold text-white">{todayRec.platform}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-2xl font-bold text-white">{todayRec.predictedDonationReferrals?.toFixed(1) ?? '—'}</p>
                            <p className="text-[10px] text-white/60">pred. referrals</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white px-5 py-4 dark:bg-[#1a1a1a]">
                          <div className="flex-1">
                            <p className="text-base font-bold text-gray-900 dark:text-white">
                              Post a {todayRec.postType?.toLowerCase()} about {todayRec.contentTopic}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {[todayRec.mediaType, todayRec.dayOfWeek].filter(Boolean).map(tag => (
                                <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-300">{tag}</span>
                              ))}
                              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                                {todayRec.predictedEngagementRate != null ? (todayRec.predictedEngagementRate * 100).toFixed(1) + '% engagement' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* ── Explore by platform ── */}
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Explore by platform</p>
                      {platformStats.map(s => {
                        const brand = PLATFORM_BRAND[s.platform]
                        const isActive = explorePlatform === s.platform
                        return (
                          <button
                            key={s.platform}
                            onClick={() => setExplorePlatform(isActive ? null : s.platform)}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                              isActive
                                ? 'text-white'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-[#444] dark:bg-[#222] dark:text-gray-300 dark:hover:border-[#666] dark:hover:text-white'
                            }`}
                            style={isActive ? { backgroundColor: brand?.hex ?? '#374151', borderColor: brand?.hex ?? '#374151' } : undefined}
                          >
                            <PlatformIcon platform={s.platform} className="h-3 w-3" />
                            {s.platform}
                          </button>
                        )
                      })}
                    </div>

                    {/* Cards: platform-specific or general top picks */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {displayRecs.length === 0 ? (
                        <p className="col-span-3 py-4 text-center text-sm text-gray-400">No recommendations found for {explorePlatform}.</p>
                      ) : displayRecs.map((r, i) => {
                          const brand = PLATFORM_BRAND[r.platform ?? '']
                          return (
                            <div key={i} className="overflow-hidden rounded-xl border border-gray-100 dark:border-[#333]">
                              <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: brand?.hex ?? '#374151' }}>
                                <PlatformIcon platform={r.platform ?? ''} className="h-3.5 w-3.5 shrink-0 text-white" />
                                <span className="truncate text-[11px] font-bold text-white">{r.platform}</span>
                                <span className="ml-auto shrink-0 text-[10px] text-white/50">#{i + 1}</span>
                              </div>
                              <div className="px-3 pt-2.5 pb-1">
                                <p className="text-xs font-semibold leading-snug text-gray-800 dark:text-gray-200">
                                  {r.postType?.toLowerCase()} about {r.contentTopic}
                                </p>
                                <p className="mt-0.5 text-[10px] text-gray-400">{r.mediaType} · {r.dayOfWeek}</p>
                              </div>
                              <div className="grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 dark:divide-[#333] dark:border-[#333]">
                                <div className="px-2 py-1.5 text-center">
                                  <p className="text-xs font-bold text-green-600 dark:text-green-400">{r.predictedDonationReferrals?.toFixed(1) ?? '—'}</p>
                                  <p className="text-[9px] text-gray-400">referrals</p>
                                </div>
                                <div className="px-2 py-1.5 text-center">
                                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                    {r.predictedEngagementRate != null ? (r.predictedEngagementRate * 100).toFixed(1) + '%' : '—'}
                                  </p>
                                  <p className="text-[9px] text-gray-400">engagement</p>
                                </div>
                              </div>
                            </div>
                          )
                      })}
                    </div>
                    {explorePlatform && (
                      <p className="mt-2 text-[11px] text-gray-400">
                        Showing top 3 for {explorePlatform} · <button onClick={() => setExplorePlatform(null)} className="underline hover:text-gray-600">clear</button>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Platform hero cards ───────────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {platformStats.map((s) => {
              const brand = PLATFORM_BRAND[s.platform]
              const isSelected = platformFilter === s.platform
              return (
                <button
                  key={s.platform}
                  onClick={() => setPlatformFilter(isSelected ? 'All' : s.platform)}
                  className="group overflow-hidden rounded-xl bg-white text-left shadow-sm transition-all hover:shadow-md dark:bg-[#1a1a1a]"
                  style={{
                    border: isSelected
                      ? `2px solid ${brand?.hex ?? '#6b7280'}`
                      : '1px solid #f3f4f6',
                  }}
                >
                  {/* Brand color top bar */}
                  <div className="h-1.5" style={{ backgroundColor: brand?.hex ?? '#94a3b8' }} />
                  <div className="p-3">
                    {/* Icon + name */}
                    <div className="mb-2.5 flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: brand?.hex ?? '#94a3b8' }}
                      >
                        <PlatformIcon platform={s.platform} className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="truncate text-xs font-bold text-gray-800 dark:text-gray-100">{s.platform}</span>
                    </div>
                    {/* Reach */}
                    <p className="text-lg font-bold leading-tight text-gray-900 dark:text-white">{fmtNum(s.reach)}</p>
                    <p className="text-[10px] text-gray-400">{s.count} posts</p>
                    {/* Avg engagement */}
                    <p className="mt-2 text-sm font-bold" style={{ color: brand?.hex ?? '#6b7280' }}>
                      {(s.avgEngRate * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-gray-400">avg engagement</p>
                    {/* Sparkline */}
                    <div className="mt-2">
                      <Sparkline values={s.sparkline} color={brand?.hex ?? '#94a3b8'} />
                    </div>
                    {s.referrals > 0 && (
                      <p className="mt-1 text-[10px] font-semibold text-green-600 dark:text-green-400">
                        {s.referrals} referrals
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>


          {/* ── Heatmap + Content mix ─────────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {/* Best time to post heatmap */}
            <Widget
              title="Best Time to Post"
              action={
                <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs dark:border-[#444]">
                  {(['engagement', 'referrals'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setHeatMetric(m)}
                      className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                        heatMetric === m
                          ? 'bg-gray-900 text-white dark:!bg-gray-200 dark:!text-black'
                          : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-[#1a1a1a] dark:text-gray-400 dark:hover:bg-[#222]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="overflow-x-auto">
                <div className="min-w-[300px]">
                  {/* Day column headers */}
                  <div className="mb-1 ml-9 grid grid-cols-7 gap-1">
                    {DAY_LABELS.map((d) => (
                      <div key={d} className="text-center text-[10px] font-semibold text-gray-400">{d}</div>
                    ))}
                  </div>
                  {/* Hour bucket rows */}
                  {HOUR_BUCKET_LABELS.map((label, bucketIdx) => (
                    <div key={bucketIdx} className="mb-1 flex items-center gap-1">
                      <div className="w-8 shrink-0 text-right text-[10px] text-gray-400">{label}</div>
                      <div className="grid flex-1 grid-cols-7 gap-1">
                        {DAY_LABELS.map((_, dayIdx) => {
                          const key = `${dayIdx}-${bucketIdx}`
                          const cell = heatmapData.map[key]
                          let intensity = 0
                          let tooltip = 'No data'
                          if (cell && cell.count > 0) {
                            const val = heatMetric === 'engagement'
                              ? cell.engSum / cell.count
                              : cell.refSum / cell.count
                            const max = heatMetric === 'engagement' ? heatmapData.maxEng : heatmapData.maxRef
                            intensity = val / max
                            tooltip = heatMetric === 'engagement'
                              ? `${((cell.engSum / cell.count) * 100).toFixed(1)}% avg eng · ${cell.count} posts`
                              : `${(cell.refSum / cell.count).toFixed(2)} avg referrals · ${cell.count} posts`
                          }
                          return (
                            <div
                              key={dayIdx}
                              className={`h-5 rounded-sm ${heatClass(intensity)}`}
                              title={tooltip}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {/* Legend */}
                  <div className="ml-9 mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">Low</span>
                    {([0, 0.2, 0.4, 0.6, 0.8] as const).map((v) => (
                      <div key={v} className={`h-3 w-5 rounded-sm ${heatClass(v === 0 ? 0.001 : v)}`} />
                    ))}
                    <span className="text-[10px] text-gray-400">High</span>
                  </div>
                </div>
              </div>
            </Widget>

            {/* Content mix */}
            <Widget title={`Content Mix${platformFilter !== 'All' ? ` · ${platformFilter}` : ''}`}>
              {contentMix.length === 0 ? (
                <p className="text-sm text-gray-400">No data.</p>
              ) : (
                <div className="space-y-4">
                  {/* Stacked proportion bar */}
                  <div className="flex h-3 w-full overflow-hidden rounded-full">
                    {contentMix.map(({ topic, pct }, i) => (
                      <div
                        key={topic}
                        className={`h-full transition-all ${TOPIC_BG[i % TOPIC_BG.length]}`}
                        style={{ width: `${pct}%` }}
                        title={`${topic}: ${pct.toFixed(1)}%`}
                      />
                    ))}
                  </div>
                  {/* Detail rows */}
                  <div className="space-y-2">
                    {contentMix.map(({ topic, posts: count, avgEng, pct }, i) => {
                      const bg = TOPIC_BG[i % TOPIC_BG.length]
                      return (
                        <div key={topic} className="flex items-center gap-3">
                          <div className={`h-3 w-3 shrink-0 rounded-sm ${bg}`} />
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700 dark:text-gray-300">{topic}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white ${bg}`}>
                              {(avgEng * 100).toFixed(1)}%
                            </span>
                            <span className="w-8 text-right text-xs font-bold text-gray-600 dark:text-gray-300">{count}</span>
                            <span className="w-8 text-right text-[10px] text-gray-400">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Widget>
          </div>

          {/* ── Top posts ─────────────────────────────────────────────────── */}
          <div className="mb-6">
            <Widget
              title={`Top Posts${platformFilter !== 'All' ? ` · ${platformFilter}` : ''} (${topPosts.length})`}
              action={
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-600 focus:outline-none dark:bg-[#222] dark:border-[#444] dark:text-gray-300"
                >
                  <option value="engagementRate">Engagement rate</option>
                  <option value="reach">Reach</option>
                  <option value="donationReferrals">Donation referrals</option>
                </select>
              }
            >
              {topPosts.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No posts found.</p>
              ) : (
                <div className="space-y-2">
                  {topPosts.map((p) => {
                    const brand = PLATFORM_BRAND[p.platform ?? '']
                    const engPct = Math.min((p.engagementRate ?? 0) * 100, 100)
                    return (
                      <div
                        key={p.postId}
                        className="flex items-center gap-3 rounded-xl border-l-4 bg-gray-50 px-4 py-3 dark:bg-[#111]"
                        style={{ borderLeftColor: brand?.hex ?? '#94a3b8' }}
                      >
                        {/* Platform icon */}
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: brand?.hex ?? '#94a3b8' }}
                        >
                          <PlatformIcon platform={p.platform ?? ''} className="h-4 w-4 text-white" />
                        </div>
                        {/* Meta */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                              {p.contentTopic ?? '—'}
                            </span>
                            {p.postType && (
                              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-[#333] dark:text-gray-400">
                                {p.postType}
                              </span>
                            )}
                            {p.isBoosted && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                Boosted
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10px] text-gray-400">
                            {fmtDate(p.createdAt)}{p.dayOfWeek ? ` · ${p.dayOfWeek}` : ''}
                          </p>
                        </div>
                        {/* Engagement bar */}
                        <div className="hidden shrink-0 sm:block">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-[#333]">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${engPct}%` }} />
                            </div>
                            <span className="w-10 text-right text-[10px] text-gray-500 dark:text-gray-400">
                              {engPct.toFixed(1)}%
                            </span>
                          </div>
                          <p className="mt-0.5 text-right text-[10px] text-gray-400">engagement</p>
                        </div>
                        {/* Reach */}
                        <div className="hidden shrink-0 text-right md:block">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{fmtNum(p.reach)}</p>
                          <p className="text-[10px] text-gray-400">reach</p>
                        </div>
                        {/* Referrals */}
                        <div className="w-12 shrink-0 text-right">
                          <p className={`text-sm font-bold ${(p.donationReferrals ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600'}`}>
                            {p.donationReferrals ?? 0}
                          </p>
                          <p className="text-[10px] text-gray-400">referrals</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Widget>
          </div>

        </>
      )}
    </div>
  )
}
