import { motion } from 'framer-motion'
import { useAnimateInView } from '../hooks/useAnimateInView'
import { useCountUp } from '../hooks/useCountUp'
import girlWriting from '../assets/490528890_720752160301656_5838193252817757157_n.jpg'

const stats = [
  { value: 10000, suffix: '+', label: 'Children at risk of exploitation' },
  { value: 1, suffix: ' in 5', label: 'Children face abuse before age 18' },
  { value: 30, suffix: '%', label: 'Of survivors receive adequate support' },
]

function StatBlock({
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
      initial={{ opacity: 0, y: 30 }}
      animate={trigger ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.3 + index * 0.15, ease: 'easeOut' }}
      className="text-center"
      role="group"
      aria-label={`${value}${suffix} — ${label}`}
    >
      <p className="text-4xl font-bold text-amber-500 md:text-5xl" aria-hidden="true">
        {count}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-white/70 md:text-base">{label}</p>
    </motion.div>
  )
}

export default function ProblemSection() {
  const { ref, isInView } = useAnimateInView({ amount: 0.2 })

  return (
    <section
      ref={ref}
      id="about"
      aria-labelledby="problem-heading"
      className="relative bg-charcoal py-24 text-white md:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Text + stats column */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">
                The Crisis
              </p>
              <h2
                id="problem-heading"
                className="mb-6 text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl"
              >
                Thousands of Children Need Protection
              </h2>

              {/* Animated divider */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                className="mb-6 h-1 w-20 origin-left rounded-full bg-amber-500"
                aria-hidden="true"
              />

              <p className="mb-4 text-base leading-relaxed text-white/70 md:text-lg">
                Across Chile, thousands of children are victims of sexual abuse,
                trafficking, and exploitation. Many lack access to safe shelter,
                professional counseling, or any path toward recovery. Existing
                resources are stretched thin, leaving vulnerable girls without
                the protection they desperately need.
              </p>
              <p className="text-base leading-relaxed text-white/70 md:text-lg">
                Without intervention, these children face cycles of trauma,
                poverty, and exploitation. They deserve safety, healing, and
                the chance to reclaim their futures.
              </p>
            </motion.div>

            {/* Stats */}
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {stats.map((stat, i) => (
                <StatBlock
                  key={stat.label}
                  value={stat.value}
                  suffix={stat.suffix}
                  label={stat.label}
                  trigger={isInView}
                  index={i}
                />
              ))}
            </div>
          </div>

          {/* Image column */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="relative"
          >
            <div className="overflow-hidden rounded-2xl">
              <img
                src={girlWriting}
                alt="A young girl sits quietly writing in a notebook, representing the children Faro Safehouse serves"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            {/* Decorative accent */}
            <div
              className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-2xl bg-amber-500/20"
              aria-hidden="true"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
