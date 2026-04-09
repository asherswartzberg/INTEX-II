import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import girlSmiling from '../assets/girlSmilingInPark.png'

export default function ImageReveal() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const scale = useTransform(scrollYProgress, [0, 0.5], [0.6, 1])
  const borderRadius = useTransform(scrollYProgress, [0, 0.5], [40, 0])
  const textOpacity = useTransform(scrollYProgress, [0.3, 0.5], [0, 1])
  const textY = useTransform(scrollYProgress, [0.3, 0.5], [40, 0])

  return (
    <section
      ref={ref}
      aria-label="Our mission statement"
      className="relative h-[150vh] bg-white"
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <motion.div
          style={{ scale, borderRadius }}
          className="relative h-full w-full overflow-hidden"
        >
          <img
            src={girlSmiling}
            alt="A girl smiling with hope"
            className="h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/50" />

          <motion.div
            style={{ opacity: textOpacity, y: textY }}
            className="absolute inset-0 flex items-center justify-start px-12 md:px-20"
          >
            <p className="max-w-2xl text-left font-display text-[clamp(1.5rem,4vw,3.5rem)] leading-[1.15] tracking-[-0.02em] text-white">
              Every child deserves safety, healing,
              and the chance to thrive.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
