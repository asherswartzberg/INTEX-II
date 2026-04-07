import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'

export function useCountUp(
  end: number,
  trigger: boolean,
  duration: number = 2
): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!trigger) return

    const controls = animate(0, end, {
      duration,
      ease: 'easeOut',
      onUpdate: (v: number) => setValue(Math.round(v)),
    })

    return () => controls.stop()
  }, [trigger, end, duration])

  return value
}
