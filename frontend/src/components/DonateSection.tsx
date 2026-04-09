import { useRef } from 'react'
import { Link } from 'react-router'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useAnimateInView } from '../hooks/useAnimateInView'
import { useAuth } from '../context/AuthContext'

export default function DonateSection() {
  const { authSession } = useAuth()
  const isAdminOrStaff = authSession.roles.some(r => r === 'Admin' || r === 'Staff')
  const isDonor = authSession.roles.includes('Donor')
  const donateLink = isAdminOrStaff ? '/admin/donors' : isDonor ? '/donor' : '/login'
  const sectionRef = useRef(null)
  const { ref: viewRef, isInView } = useAnimateInView({ amount: 0.3 })
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const line1X = useTransform(scrollYProgress, [0, 1], [-30, 30])
  const line2X = useTransform(scrollYProgress, [0, 1], [30, -30])
  const line3X = useTransform(scrollYProgress, [0, 1], [-20, 20])

  return (
    <section
      ref={sectionRef}
      id="donate"
      aria-labelledby="donate-heading"
      className="relative overflow-hidden bg-black py-24 md:py-32"
    >
      <div ref={viewRef} className="mx-auto max-w-7xl px-6 md:px-10">
        <div id="donate-heading" className="mb-20">
          <motion.p
            style={{ x: line1X }}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="font-display text-[clamp(2.5rem,7vw,7rem)] leading-[1.05] tracking-[-0.04em] text-white"
          >
            Help us build
          </motion.p>
          <motion.p
            style={{ x: line2X }}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-[clamp(2.5rem,7vw,7rem)] leading-[1.05] tracking-[-0.04em] text-white/40"
          >
            a safer world
          </motion.p>
          <motion.p
            style={{ x: line3X }}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-display text-[clamp(2.5rem,7vw,7rem)] leading-[1.05] tracking-[-0.04em] text-white"
          >
            for children.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between"
        >
          <p className="max-w-md text-base leading-[1.7] text-white/40 md:text-lg">
            Your generosity provides safe homes, counseling, education,
            and a path to recovery. Every contribution makes a lasting
            difference in a child's life.
          </p>

          <div className="flex flex-shrink-0 gap-4">
            <Link
              to={donateLink}
              className="btn-wipe-light-grey rounded-full bg-white px-8 py-4 text-sm font-semibold text-black"
            >
              Donate now
            </Link>
            <a
              href="#work"
              className="rounded-full border border-white/20 px-8 py-4 text-sm font-medium text-white transition-all hover:border-white/50"
            >
              See how we help
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
