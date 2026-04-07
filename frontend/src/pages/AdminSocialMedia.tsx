import { useEffect, useState, useMemo } from 'react'
import { fetchSocialMediaPosts } from '../apis/socialMediaPostsApi'
import { fetchSocialMediaRecommendations } from '../apis/socialMediaRecommendationsApi'
import type { SocialMediaPost } from '../types/SocialMediaPost'
import type { SocialMediaRecommendation } from '../types/SocialMediaRecommendation'

function pct(n: number | null, total: number) {
  if (!n || !total) return '0%'
  return ((n / total) * 100).toFixed(1) + '%'
}

function fmtNum(n: number | null) {
  if (n == null) return '—'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PLATFORM_COLORS: Record<string, string> = {
  Facebook: 'bg-blue-600',
  Instagram: 'bg-pink-500',
  Twitter: 'bg-sky-500',
  YouTube: 'bg-red-600',
  TikTok: 'bg-gray-800',
  LinkedIn: 'bg-blue-700',
}

const PLATFORM_TEXT: Record<string, string> = {
  Facebook: 'text-blue-600',
  Instagram: 'text-pink-500',
  Twitter: 'text-sky-500',
  YouTube: 'text-red-600',
  TikTok: 'text-gray-800',
  LinkedIn: 'text-blue-700',
}

export default function AdminSocialMedia() {
  const [posts, setPosts] = useState<SocialMediaPost[]>([])
  const [recommendations, setRecommendations] = useState<SocialMediaRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState('All')
  const [sortBy, setSortBy] = useState<'engagementRate' | 'reach' | 'donationReferrals'>('engagementRate')

  useEffect(() => {
    fetchSocialMediaPosts({ pageSize: 200 })
      .then(setPosts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchSocialMediaRecommendations().then(setRecommendations).catch(console.error)
  }, [])

  // Unique platforms
  const platformOptions = useMemo(() => {
    const s = new Set(posts.map((p) => p.platform).filter(Boolean) as string[])
    return ['All', ...Array.from(s)]
  }, [posts])
  void platformOptions // used later for filter UI

  const filtered = useMemo(() =>
    platformFilter === 'All' ? posts : posts.filter((p) => p.platform === platformFilter),
    [posts, platformFilter]
  )

  // Per-platform aggregates
  const platformStats = useMemo(() => {
    const map: Record<string, { posts: number; impressions: number; reach: number; engRate: number[]; referrals: number }> = {}
    posts.forEach((p) => {
      const pl = p.platform ?? 'Unknown'
      if (!map[pl]) map[pl] = { posts: 0, impressions: 0, reach: 0, engRate: [], referrals: 0 }
      map[pl].posts++
      map[pl].impressions += p.impressions ?? 0
      map[pl].reach += p.reach ?? 0
      if (p.engagementRate != null) map[pl].engRate.push(p.engagementRate)
      map[pl].referrals += p.donationReferrals ?? 0
    })
    return Object.entries(map).map(([platform, d]) => ({
      platform,
      posts: d.posts,
      impressions: d.impressions,
      reach: d.reach,
      avgEngRate: d.engRate.length ? d.engRate.reduce((a, b) => a + b, 0) / d.engRate.length : 0,
      referrals: d.referrals,
    })).sort((a, b) => b.reach - a.reach)
  }, [posts])

  // Top posts
  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0)).slice(0, 20),
    [filtered, sortBy]
  )

  return (
    <div className="min-h-full bg-[#F7F8FA] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Social Media Analytics</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />)}
        </div>
      ) : (
        <>
          {/* Platform cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {platformStats.map((s) => (
              <button
                key={s.platform}
                onClick={() => setPlatformFilter(s.platform)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  platformFilter === s.platform
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${PLATFORM_COLORS[s.platform] ?? 'bg-gray-400'}`} />
                  <span className={`text-sm font-semibold ${PLATFORM_TEXT[s.platform] ?? 'text-gray-700'}`}>
                    {s.platform}
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900">{fmtNum(s.reach)}</p>
                <p className="text-xs text-gray-400">reach · {s.posts} posts</p>
                <p className="mt-1 text-xs text-gray-500">
                  {(s.avgEngRate * 100).toFixed(1)}% avg engagement
                </p>
                {s.referrals > 0 && (
                  <p className="mt-0.5 text-xs font-medium text-green-600">{s.referrals} donation referrals</p>
                )}
              </button>
            ))}
            {platformFilter !== 'All' && (
              <button
                onClick={() => setPlatformFilter('All')}
                className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-400 hover:border-gray-300"
              >
                Show all platforms
              </button>
            )}
          </div>

          {/* Top posts table */}
          <div className="rounded-xl border border-gray-100 bg-white">
            <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-800">
                Top posts {platformFilter !== 'All' ? `· ${platformFilter}` : ''}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-600 focus:outline-none"
                >
                  <option value="engagementRate">Engagement rate</option>
                  <option value="reach">Reach</option>
                  <option value="donationReferrals">Donation referrals</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    {['DATE', 'PLATFORM', 'TYPE', 'TOPIC', 'REACH', 'ENGAGEMENT', 'REFERRALS', 'BOOSTED'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No posts found.</td></tr>
                  ) : (
                    sorted.map((p) => (
                      <tr key={p.postId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{fmtDate(p.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${PLATFORM_TEXT[p.platform ?? ''] ?? 'text-gray-600'}`}>
                            {p.platform ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{p.postType ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{p.contentTopic ?? '—'}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{fmtNum(p.reach)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: pct(p.engagementRate, 1) }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {p.engagementRate != null ? (p.engagementRate * 100).toFixed(1) + '%' : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {(p.donationReferrals ?? 0) > 0 ? (
                            <span className="font-semibold text-green-700">{p.donationReferrals}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.isBoosted ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Boosted</span>
                          ) : (
                            <span className="text-xs text-gray-400">Organic</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ML Recommendations */}
          {recommendations.length > 0 && (
            <div className="mt-6 rounded-xl border border-gray-100 bg-white">
              <div className="border-b border-gray-50 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-800">Recommended Posting Strategies</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['PLATFORM', 'POST TYPE', 'MEDIA', 'TOPIC', 'BEST DAY', 'REFERRALS', 'ENGAGEMENT'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recommendations.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${PLATFORM_TEXT[r.platform ?? ''] ?? 'text-gray-600'}`}>
                            {r.platform}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.postType}</td>
                        <td className="px-4 py-3 text-gray-600">{r.mediaType ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.contentTopic}</td>
                        <td className="px-4 py-3 text-gray-600">{r.dayOfWeek ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-green-700">{r.predictedDonationReferrals?.toFixed(1) ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-blue-700">{r.predictedEngagementRate != null ? (r.predictedEngagementRate * 100).toFixed(1) + '%' : '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-50 px-5 py-3">
                <p className="text-xs text-gray-400">Predictions generated by ML models &middot; Updated nightly</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
