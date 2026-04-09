import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  visible: boolean
}

export default function LoadingScreen({ visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
        >
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl text-white md:text-4xl"
            style={{ fontFamily: "'EB Garamond', serif" }}
          >
            Faro Safehouse
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-white/50"
          >
            Safety &middot; Healing &middot; Empowerment
          </motion.p>

          <div className="mt-10 h-[1px] w-32 overflow-hidden bg-white/10">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="h-full w-full bg-white/60"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
