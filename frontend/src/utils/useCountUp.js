import { useState, useEffect, useRef } from 'react'

export function useCountUp(targetValue, duration = 1200) {
  const [displayValue, setDisplayValue] = useState(() => (Number.isFinite(targetValue) ? targetValue : 0))
  const previousValueRef = useRef(displayValue)

  useEffect(() => {
    if (!Number.isFinite(targetValue)) {
      return
    }

    const startValue = previousValueRef.current != null ? previousValueRef.current : 0
    const endValue = targetValue
    if (startValue === endValue) {
      return
    }

    const startTime = performance.now()
    let frameId

    function step(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Cubic ease out: 1 - pow(1 - progress, 3)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startValue + (endValue - startValue) * easeOut)

      setDisplayValue(current)

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        previousValueRef.current = endValue
      }
    }

    frameId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [targetValue, duration])

  if (!Number.isFinite(targetValue)) {
    return null
  }

  return displayValue
}
