import { motion } from 'framer-motion'
import { useAnimateInView } from '../hooks/useAnimateInView'

export default function DonateSection() {
  const { ref, isInView } = useAnimateInView({ amount: 0.3 })

  return (
    <section
      ref={ref}
      id="donate"
      aria-labelledby="donate-heading"
      className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-accent py-24 md:py-32"
    >
      {/* Subtle radial decoration */}
      <div
        className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-black/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center md:px-8">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/80"
        >
          Make a Difference
        </motion.p>

        <motion.h2
          id="donate-heading"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mb-6 text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl"
        >
          Bring Safety, Healing &amp; Empowerment to Children in Need
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-white/90 md:text-lg"
        >
          Your generosity provides safe homes, counseling, education, and a path
          to recovery for survivors. Every contribution — no matter the size —
          makes a lasting difference.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <motion.a
            href="#"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block rounded-xl bg-white px-10 py-4 text-lg font-bold text-amber-600 shadow-lg transition-shadow hover:shadow-xl focus-visible:outline-white"
          >
            Donate Now
          </motion.a>
          <motion.a
            href="#work"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block rounded-xl border-2 border-white/40 px-10 py-4 text-lg font-semibold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-white"
          >
            Learn How We Help
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
