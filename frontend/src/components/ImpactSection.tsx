import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useAnimateInView } from '../hooks/useAnimateInView'
import { useCountUp } from '../hooks/useCountUp'
import girlsLookingAtSky from '../assets/girlsLookingAtSky.jpg'

const impactStats = [
  { value: 500, suffix: '+', label: 'Children sheltered' },
  { value: 200, suffix: '+', label: 'Families reunited' },
  { value: 15, suffix: '', label: 'Safe homes' },
  { value: 98, suffix: '%', label: 'Completion rate' },
]

function ImpactStat({ value, suffix, label, trigger, index }: {
  value: number; suffix: string; label: string; trigger: boolean; index: number
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
      <p className="text-5xl font-bold text-black md:text-6xl lg:text-7xl" aria-hidden="true">
        {count}<span className="text-medium-gray">{suffix}</span>
      </p>
      <p className="mt-2 text-sm text-medium-gray">{label}</p>
    </motion.div>
  )
}

export default function ImpactSection() {
  const sectionRef = useRef(null)
  const { ref: viewRef, isInView } = useAnimateInView({ amount: 0.15 })
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const imageX = useTransform(scrollYProgress, [0, 1], [50, -50])
  const imageRotate = useTransform(scrollYProgress, [0, 1], [-1, 1])
  const quoteX = useTransform(scrollYProgress, [0, 1], [-20, 20])

  return (
    <section
      ref={sectionRef}
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

        <div className="grid grid-cols-2 gap-x-8 gap-y-16 lg:grid-cols-4">
          {impactStats.map((stat, i) => (
            <ImpactStat key={stat.label} {...stat} trigger={isInView} index={i} />
          ))}
        </div>

        {/* Floating image — reduced drift on mobile */}
        <motion.div
          style={{ x: imageX, rotate: imageRotate }}
          className="mt-20 w-full overflow-hidden rounded-sm md:mt-28 md:-mr-16 md:ml-auto md:w-2/3 lg:w-1/2"
        >
          <img
            src={girlsLookingAtSky}
            alt="Girls in a group circle at the safehouse"
            className="w-full object-cover aspect-[16/10]"
            loading="lazy"
          />
        </motion.div>

        <motion.blockquote
          style={{ x: quoteX }}
          className="mt-20 max-w-xl border-l border-black pl-8"
        >
          <p className="text-lg leading-[1.7] text-dark-gray md:text-xl">
            "We are full of hope, love and new beginnings.
            We treat each other as family where each individual
            is seen, heard, and loved."
          </p>
          <footer className="mt-4 text-sm text-medium-gray">
            — Lighthouse Sanctuary, our inspiration
          </footer>
        </motion.blockquote>
      </div>
    </section>
  )
}
