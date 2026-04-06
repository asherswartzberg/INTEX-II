import { motion } from 'framer-motion'
import { useAnimateInView } from '../hooks/useAnimateInView'
import { useCountUp } from '../hooks/useCountUp'
import girlsCircle from '../assets/lighthouseGirlsInCircle.jpg'
import girlsLearning from '../assets/lighthouseGirlsOutsideLearning.jpg'

const impactStats = [
  { value: 500, suffix: '+', label: 'Children Sheltered' },
  { value: 200, suffix: '+', label: 'Families Reunited' },
  { value: 15, suffix: '', label: 'Safe Homes Operating' },
  { value: 98, suffix: '%', label: 'Program Completion Rate' },
]

function ImpactStat({
  value,
  suffix,
  label,
  trigger,
  index,
}: {
  value: number
  suffix: string
  label: string
  trigger: boolean
  index: number
}) {
  const count = useCountUp(value, trigger)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={trigger ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: 0.2 + index * 0.12, ease: 'easeOut' }}
      className="flex flex-col items-center text-center"
      role="group"
      aria-label={`${value}${suffix} — ${label}`}
    >
      <p className="text-5xl font-bold text-amber-500 md:text-6xl" aria-hidden="true">
        {count}
        {suffix}
      </p>

      {/* Progress bar decoration */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={trigger ? { scaleX: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.5 + index * 0.12, ease: 'easeOut' }}
        className="my-3 h-1 w-16 origin-left rounded-full bg-amber-500/30"
        aria-hidden="true"
      />

      <p className="text-sm font-medium text-medium-gray md:text-base">{label}</p>
    </motion.div>
  )
}

export default function ImpactSection() {
  const { ref, isInView } = useAnimateInView({ amount: 0.15 })

  return (
    <section
      ref={ref}
      id="impact"
      aria-labelledby="impact-heading"
      className="bg-warm-gray py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mx-auto mb-16 max-w-2xl text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">
            Our Impact
          </p>
          <h2
            id="impact-heading"
            className="mb-4 text-3xl font-bold tracking-tight text-dark md:text-4xl lg:text-5xl"
          >
            Transforming Lives, One Child at a Time
          </h2>
          <p className="text-base leading-relaxed text-medium-gray md:text-lg">
            Every number represents a real child whose life has been changed
            through safety, healing, and empowerment.
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {impactStats.map((stat, i) => (
            <ImpactStat
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              trigger={isInView}
              index={i}
            />
          ))}
        </div>

        {/* Photo grid + testimonial */}
        <div className="mt-20 grid gap-8 lg:grid-cols-2 lg:items-center">
          {/* Photos */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5, ease: 'easeOut' }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src={girlsCircle}
                alt="Girls sitting together in a circle during a group session at the safehouse"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="overflow-hidden rounded-2xl">
              <img
                src={girlsLearning}
                alt="Girls attending an outdoor educational session celebrating Women's Month"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </motion.div>

          {/* Testimonial */}
          <motion.blockquote
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.6, ease: 'easeOut' }}
            className="rounded-2xl border border-soft-gray bg-white p-8 shadow-sm md:p-12"
          >
            <p className="mb-4 text-lg italic leading-relaxed text-dark md:text-xl">
              &ldquo;We are Lighthouse: full of hope, love and new beginnings.
              Our focus is progress in all aspects of life. We treat each other as
              family where each individual is seen, heard, and loved. We create
              fun memories, we fight for justice and we acknowledge God in all
              we do.&rdquo;
            </p>
            <footer className="text-sm font-medium text-medium-gray">
              — Lighthouse Sanctuary Mission, our inspiration
            </footer>
          </motion.blockquote>
        </div>
      </div>
    </section>
  )
}
