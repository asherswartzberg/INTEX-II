import { useRef } from 'react'
import { useInView } from 'framer-motion'

interface UseAnimateInViewOptions {
  amount?: number
  once?: boolean
}

export function useAnimateInView(options: UseAnimateInViewOptions = {}) {
  const { amount = 0.2, once = true } = options
  const ref = useRef(null)
  const isInView = useInView(ref, { amount, once })
  return { ref, isInView }
}
