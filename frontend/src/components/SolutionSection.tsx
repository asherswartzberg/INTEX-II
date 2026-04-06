import { useAnimateInView } from '../hooks/useAnimateInView'
import { motion } from 'framer-motion'
import ServiceCard from './ServiceCard'

const services = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: 'Safety',
    description:
      'Creating safe environments where healing can begin. Our homes provide 24/7 care, nutrition, and stability.',
    detail:
      'Each safehouse provides around-the-clock supervision, nutritious meals, secure sleeping quarters, and a family-like atmosphere. Safety is the foundation that enables every other step in recovery.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    title: 'Healing',
    description:
      'Building trust through counseling, therapy, and individualized care plans that address each child\'s unique needs.',
    detail:
      'Licensed counselors provide individual and group therapy, process recordings track each girl\'s journey, and personalized intervention plans ensure holistic mental, emotional, and physical recovery.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
    title: 'Justice',
    description:
      'Supporting survivors in their pursuit of justice through legal advocacy and court accompaniment.',
    detail:
      'We partner with legal professionals to ensure every child has representation. Our staff accompanies girls to court hearings and advocates for their rights throughout the judicial process.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
    title: 'Empowerment',
    description:
      'Transforming survivors into leaders through education, life skills training, and community reintegration.',
    detail:
      'Education programs, vocational training, and mentorship prepare each girl for independent life. We walk alongside them through reintegration, ensuring lasting transformation from survivor to leader.',
  },
]

export default function SolutionSection() {
  const { ref, isInView } = useAnimateInView({ amount: 0.15 })

  return (
    <section
      ref={ref}
      id="work"
      aria-labelledby="solution-heading"
      className="bg-warm-white py-24 md:py-32"
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
            Our Approach
          </p>
          <h2
            id="solution-heading"
            className="mb-4 text-3xl font-bold tracking-tight text-dark md:text-4xl lg:text-5xl"
          >
            Four Pillars of Transformation
          </h2>
          <p className="text-base leading-relaxed text-medium-gray md:text-lg">
            Inspired by Lighthouse Sanctuary, our model guides each child from
            crisis to confidence through a proven progression of care.
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, i) => (
            <ServiceCard
              key={service.title}
              icon={service.icon}
              title={service.title}
              description={service.description}
              detail={service.detail}
              index={i}
              trigger={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
