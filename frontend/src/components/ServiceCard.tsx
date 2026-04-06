import { motion } from 'framer-motion'

interface ServiceCardProps {
  icon: React.ReactNode
  title: string
  description: string
  detail: string
  index: number
  trigger: boolean
}

export default function ServiceCard({
  icon,
  title,
  description,
  detail,
  index,
  trigger,
}: ServiceCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      animate={trigger ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.15, ease: 'easeOut' }}
      whileHover="hover"
      className="group relative overflow-hidden rounded-2xl border border-soft-gray bg-white p-8 transition-shadow duration-300 hover:shadow-xl focus-within:shadow-xl"
      tabIndex={0}
      aria-label={`${title}: ${description}`}
    >
      {/* Crosshair corner decorations */}
      <span
        className="pointer-events-none absolute left-4 top-4 h-3 w-px bg-amber-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-translate-y-1"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute left-4 top-4 h-px w-3 bg-amber-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-translate-x-1"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute right-4 top-4 h-3 w-px bg-amber-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-translate-y-1"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute right-4 top-4 h-px w-3 bg-amber-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute left-4 bottom-4 h-3 w-px bg-amber-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-1"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute left-4 bottom-4 h-px w-3 bg-amber-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-translate-x-1"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute right-4 bottom-4 h-3 w-px bg-amber-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-1"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute right-4 bottom-4 h-px w-3 bg-amber-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1"
        aria-hidden="true"
      />

      {/* Icon */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>

      {/* Text content */}
      <h3 className="mb-2 text-xl font-bold text-dark">{title}</h3>
      <p className="text-sm leading-relaxed text-medium-gray">{description}</p>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex items-end bg-gradient-to-t from-amber-600 to-amber-500/90 p-8 text-white transition-[clip-path] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [clip-path:inset(100%_0_0_0)] group-hover:[clip-path:inset(0_0_0_0)]"
        aria-hidden="true"
      >
        <div>
          <h3 className="mb-2 text-xl font-bold">{title}</h3>
          <p className="text-sm leading-relaxed text-white/90">{detail}</p>
        </div>
      </div>
    </motion.article>
  )
}
