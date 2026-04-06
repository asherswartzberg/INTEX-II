import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import heroVideo from '../assets/1775513061936710.mp4'
import heroPoster from '../assets/490528890_720752160301656_5838193252817757157_n.jpg'

export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.3])
  const textOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 0.5], [0, -80])
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.6], [0.35, 0.85])

  return (
    <div ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Video — zooms on scroll */}
        <motion.div style={{ scale: videoScale }} className="absolute inset-0">
          <video
            autoPlay muted loop playsInline preload="metadata"
            poster={heroPoster}
            className="h-full w-full object-cover"
            aria-hidden="true"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        </motion.div>

        <motion.div
          style={{ opacity: overlayOpacity }}
          className="absolute inset-0 bg-black"
          aria-hidden="true"
        />

        {/* Content — bottom left, bold */}
        <motion.div
          style={{ opacity: textOpacity, y: textY }}
          className="absolute bottom-0 left-0 z-10 max-w-2xl px-8 pb-28 md:px-16 md:pb-32"
        >
          <h1 className="font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[1.05] tracking-[-0.03em] text-white">
            Safety, healing &amp;&nbsp;
            <em className="not-italic text-white/60">empowerment</em>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-white/50 md:text-lg">
            Safe homes and recovery for girls who are survivors
            of abuse and trafficking in Chile.
          </p>

          <div className="mt-10 flex gap-4">
            <a
              href="#donate"
              className="btn-slide rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-all hover:-translate-y-0.5"
            >
              <span className="btn-text">Support our mission</span>
              <span className="btn-text-hover">Support our mission</span>
            </a>
            <a
              href="#about"
              className="rounded-full border border-white/20 px-7 py-3 text-sm font-medium text-white transition-all hover:border-white/50"
            >
              Learn more
            </a>
          </div>
        </motion.div>

        {/* Scroll line */}
        <motion.div
          style={{ opacity: textOpacity }}
          className="absolute bottom-10 right-10 z-10"
          aria-hidden="true"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-10 w-px bg-white/20"
          />
        </motion.div>
      </div>
    </div>
  )
}
