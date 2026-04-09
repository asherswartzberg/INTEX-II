import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAnimateInView } from '../hooks/useAnimateInView'
import { useCountUp } from '../hooks/useCountUp'
import { fetchPublicImpactSummary } from '../apis/publicImpactApi'
import type { PublicImpactSummaryDto } from '../types/apiDtos'
import girlsLookingAtSky from '../assets/girlsLookingAtSky.jpg'

const fallbackStats = [
  { value: 500, suffix: '+', label: 'Children sheltered' },
  { value: 200, suffix: '+', label: 'Families reunited' },
  { value: 15, suffix: '', label: 'Safe homes' },
  { value: 98, suffix: '%', label: 'Completion rate' },
]

function ImpactStat({ value, suffix, prefix, label, trigger, index }: {
  value: number; suffix: string; prefix?: string; label: string; trigger: boolean; index: number
}) {
  const count = useCountUp(value, trigger)
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={trigger ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      role="group"
      aria-label={`${value}${suffix} — ${label}`}
    >
      <p className="text-4xl font-bold text-black md:text-5xl" aria-hidden="true">
        {prefix}<span>{count.toLocaleString()}</span><span className="text-medium-gray">{suffix}</span>
      </p>
      <p className="mt-2 text-sm text-medium-gray">{label}</p>
    </motion.div>
  )
}

export default function ImpactSection() {
  const [impact, setImpact] = useState<PublicImpactSummaryDto | null>(null)

  useEffect(() => {
    fetchPublicImpactSummary().then(setImpact).catch(() => {})
  }, [])

  const impactStats = impact
    ? [
        { value: impact.activeResidentsCount, suffix: '', label: 'Active residents' },
        { value: impact.safehouseCount, suffix: '', label: 'Safe homes operating' },
        { value: Math.round(impact.totalDonationsAllTime), suffix: '', label: 'Total donated', prefix: '$' },
        { value: impact.totalGirlsServed, suffix: '+', label: 'Girls served' },
      ]
    : fallbackStats

  const { ref: viewRef, isInView } = useAnimateInView({ amount: 0.15 })


  return (
    <section
      id="impact"
      aria-labelledby="impact-heading"
      className="relative z-10 overflow-hidden bg-white py-40 md:py-52"
    >
      <div ref={viewRef} className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="mb-28">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-medium-gray">
            Our impact
          </p>
          <h2
            id="impact-heading"
            className="mt-4 max-w-lg font-display text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] tracking-[-0.03em] text-black"
          >
            Every number is a child whose life has changed
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-16 lg:grid-cols-4">
          {impactStats.map((stat, i) => (
            <ImpactStat key={stat.label} {...stat} trigger={isInView} index={i} />
          ))}
        </div>

        {/* Cinematic reveal image with quote overlay */}
        <motion.div
          initial={{ clipPath: 'inset(18% 8% round 4px)' }}
          whileInView={{ clipPath: 'inset(0% 0% round 0px)' }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, amount: 0.3 }}
          className="relative mt-20 w-full overflow-hidden md:mt-28"
          style={{ aspectRatio: '16/9' }}
        >
          <motion.img
            initial={{ scale: 1.18 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, amount: 0.3 }}
            src={girlsLookingAtSky}
            alt="Girls looking at the sky at the safehouse"
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {/* Dark gradient for quote legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {/* Quote — bottom right */}
          <motion.blockquote
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
            viewport={{ once: true, amount: 0.3 }}
            className="absolute top-8 left-8 max-w-xl text-left md:top-12 md:left-12 md:max-w-2xl"
          >
            <p className="font-display text-3xl leading-[1.2] tracking-[-0.02em] text-white md:text-5xl">
              "We create fun memories, we fight for justice, and we acknowledge God in all we do."
            </p>
            <footer className="mt-3 text-sm text-white/60">— Faro Safehouse</footer>
          </motion.blockquote>
        </motion.div>
      </div>
    </section>
  )
}
