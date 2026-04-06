import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { useAnimateInView } from '../hooks/useAnimateInView'
import { useCountUp } from '../hooks/useCountUp'
import girlSmiling from '../assets/chileanGirlSmiling.webp'

const stats = [
  { value: 10000, suffix: '+', label: 'Children at risk' },
  { value: 1, suffix: ' in 5', label: 'Face abuse before 18' },
  { value: 30, suffix: '%', label: 'Receive support' },
]

function Stat({ value, suffix, label, trigger }: {
  value: number; suffix: string; label: string; trigger: boolean
}) {
  const count = useCountUp(value, trigger)
  return (
    <div role="group" aria-label={`${value}${suffix} — ${label}`}>
      <p className="text-3xl font-bold text-black md:text-4xl" aria-hidden="true">
        {count}{suffix}
      </p>
      <p className="mt-1 text-sm text-medium-gray">{label}</p>
    </div>
  )
}

export default function ProblemSection() {
  const sectionRef = useRef(null)
  const { ref: viewRef, isInView } = useAnimateInView({ amount: 0.2 })
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  // Reduce motion on mobile via smaller values
  const imageX = useTransform(scrollYProgress, [0, 1], [-40, 40])
  const imageY = useTransform(scrollYProgress, [0, 1], [60, -40])
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 1.05])
  const textX = useTransform(scrollYProgress, [0, 0.5], [30, 0])
  const textOpacity = useTransform(scrollYProgress, [0, 0.3], [0, 1])

  return (
    <section
      ref={sectionRef}
      id="about"
      aria-labelledby="problem-heading"
      className="relative z-10 overflow-hidden bg-white"
    >
      <div ref={viewRef} className="mx-auto max-w-7xl px-6 py-40 md:px-10 md:py-52">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
          {/* Image — drifts across */}
          <motion.div
            style={{ x: imageX, y: imageY, scale: imageScale }}
            className="relative lg:col-span-5"
          >
            <div className="overflow-hidden rounded-sm">
              <img
                src={girlSmiling}
                alt="A young girl sits writing in a notebook"
                className="w-full object-cover aspect-[3/4]"
                loading="lazy"
              />
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            style={{ x: textX, opacity: textOpacity }}
            className="lg:col-span-6 lg:col-start-7 lg:pt-16"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-medium-gray">
              The crisis
            </p>
            <h2
              id="problem-heading"
              className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] tracking-[-0.03em] text-black"
            >
              Thousands of children need protection
            </h2>

            <div className="mt-8 space-y-5 text-base leading-[1.7] text-dark-gray md:text-lg">
              <p>
                Across Chile, thousands of children are victims of sexual abuse,
                trafficking, and exploitation. Many lack access to safe shelter
                or professional counseling.
              </p>
              <p>
                Without intervention, these children face cycles of trauma and
                poverty. They deserve safety and the chance to reclaim their
                futures.
              </p>
            </div>

            <div className="mt-14 flex flex-wrap gap-8 md:gap-12">
              {stats.map((s) => (
                <Stat key={s.label} {...s} trigger={isInView} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
