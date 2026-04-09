import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { useAnimateInView } from '../hooks/useAnimateInView'
import girlsCircle from '../assets/lighthouseGirlsInCircle.jpg'
import girlsLearning from '../assets/lighthouseGirlsOutsideLearning.jpg'
import girlWriting from '../assets/girlWriting.jpg'
import girlsPraying from '../assets/girlsPraying.jpg'

const pillars = [
  {
    num: '01',
    title: 'Safety',
    text: 'Creating safe environments where healing can begin. Our homes provide around-the-clock care, nutrition, secure sleeping quarters, and a family-like atmosphere.',
    image: girlWriting,
    imageAlt: 'A girl finding safety and peace at the safehouse',
  },
  {
    num: '02',
    title: 'Healing',
    text: 'Licensed counselors provide individual and group therapy. Personalized intervention plans ensure holistic mental, emotional, and physical recovery for every child.',
    image: girlsCircle,
    imageAlt: 'Girls in a group therapy circle at the safehouse',
  },
  {
    num: '03',
    title: 'Justice',
    text: 'We partner with legal professionals to ensure every child has representation. Our staff accompanies girls to court hearings and advocates for their rights.',
    image: girlsLearning,
    imageAlt: 'Girls attending an educational session',
  },
  {
    num: '04',
    title: 'Empowerment',
    text: 'Education, vocational training, and mentorship prepare each girl for independent life. We walk alongside them through reintegration — from survivor to leader.',
    image: girlsPraying,
    imageAlt: 'Girls praying together in a circle',
  },
]

/* ─── Desktop: sticky scroll card ─── */
function PillarCard({ pillar, progress, index }: {
  pillar: typeof pillars[0]
  progress: MotionValue<number>
  index: number
}) {
  const opacity = useTransform(
    progress,
    index === 0 ? [0, 0.85, 1] : [0, 0.15, 0.85, 1],
    index === 0 ? [1, 1, 0]   : [0, 1,    1,    0]
  )
  const textY = useTransform(
    progress,
    index === 0 ? [0, 0.85, 1]    : [0, 0.15, 0.85, 1],
    index === 0 ? [0, 0, -80]     : [80, 0, 0, -80]
  )
  const imageX = useTransform(
    progress,
    index === 0 ? [0, 0.8, 1] : [0, 0.2, 0.8, 1],
    index === 0
      ? [0, 0, index % 2 === 0 ? -20 : 20]
      : [index % 2 === 0 ? 40 : -40, 0, 0, index % 2 === 0 ? -20 : 20]
  )
  const imageScale = useTransform(
    progress,
    index === 0 ? [0, 0.8, 1] : [0, 0.2, 0.8, 1],
    index === 0 ? [1, 1, 0.9] : [0.8, 1, 1, 0.9]
  )

  return (
    <motion.div style={{ opacity }} className="absolute inset-0 flex items-center px-16">
      <div className="mx-auto grid w-full max-w-6xl gap-12 xl:grid-cols-2 xl:items-center xl:gap-16">
        <motion.div style={{ y: textY }} className={index % 2 === 1 ? 'xl:order-2' : ''}>
          <span className="font-mono text-xs tracking-[0.3em] text-medium-gray">{pillar.num}</span>
          <h3 className="mt-3 font-display text-5xl leading-[1.05] tracking-[-0.03em] text-black xl:text-6xl">
            {pillar.title}
          </h3>
          <p className="mt-6 max-w-md text-base leading-[1.7] text-dark-gray xl:text-lg">{pillar.text}</p>
        </motion.div>
        <motion.div
          style={{ x: imageX, scale: imageScale }}
          className={`overflow-hidden rounded-sm ${index % 2 === 1 ? 'xl:order-1' : ''}`}
        >
          <img src={pillar.image} alt={pillar.imageAlt} className="w-full object-cover aspect-[4/3]" loading="lazy" />
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ─── Mobile: simple stacked card ─── */
function MobilePillarCard({ pillar, index }: { pillar: typeof pillars[0]; index: number }) {
  const { ref, isInView } = useAnimateInView({ amount: 0.2 })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="border-t border-border pt-8"
    >
      <span className="font-mono text-xs tracking-[0.3em] text-medium-gray">{pillar.num}</span>
      <h3 className="mt-3 font-display text-3xl leading-[1.1] tracking-[-0.02em] text-black sm:text-4xl">
        {pillar.title}
      </h3>
      <p className="mt-4 text-base leading-[1.7] text-dark-gray">{pillar.text}</p>
      <div className="mt-6 overflow-hidden rounded-sm">
        <img src={pillar.image} alt={pillar.imageAlt} className="w-full object-cover aspect-[4/3]" loading="lazy" />
      </div>
    </motion.div>
  )
}

export default function SolutionSection() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const pillarProgresses = pillars.map((_, i) => {
    const start = i / pillars.length
    const end = (i + 1) / pillars.length
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useTransform(scrollYProgress, [start, end], [0, 1])
  })

  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  const counterNum = useTransform(scrollYProgress, [0, 0.99], [1, 4])

  return (
    <>
      {/* ─── Desktop: sticky scroll ─── */}
      <section
        ref={containerRef}
        id="work"
        aria-labelledby="solution-heading-desktop"
        className="relative hidden bg-off-white xl:block"
        style={{ height: `${(pillars.length + 1) * 100}vh` }}
      >
        <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
          <div className="flex items-end justify-between px-16 pt-28">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-medium-gray">Our approach</p>
              <h2 id="solution-heading-desktop" className="mt-1 text-sm font-medium text-dark-gray">
                Four pillars of transformation
              </h2>
            </div>
            <motion.span className="font-mono text-sm text-medium-gray">
              <motion.span>{useTransform(counterNum, (v) => String(Math.round(v)).padStart(2, '0'))}</motion.span>
              <span className="mx-1 text-border">/</span>
              <span>04</span>
            </motion.span>
          </div>

          <div className="mx-16 mt-5 h-px bg-border" aria-hidden="true">
            <motion.div style={{ width: progressWidth }} className="h-full bg-black transition-none" />
          </div>

          <div className="relative flex-1">
            {pillars.map((pillar, i) => (
              <PillarCard key={pillar.num} pillar={pillar} progress={pillarProgresses[i]} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Mobile: stacked cards ─── */}
      <section
        id="work"
        aria-labelledby="solution-heading-mobile"
        className="overflow-hidden bg-off-white xl:hidden"
      >
        <div className="mx-auto max-w-3xl px-6 py-24 sm:px-10 md:px-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-medium-gray">Our approach</p>
          <h2 id="solution-heading-mobile" className="mt-2 font-display text-3xl tracking-[-0.02em] text-black">
            Four pillars of transformation
          </h2>

          <div className="mt-12 flex flex-col gap-12">
            {pillars.map((pillar, i) => (
              <MobilePillarCard key={pillar.num} pillar={pillar} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
