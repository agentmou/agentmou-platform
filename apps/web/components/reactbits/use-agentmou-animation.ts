'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Spring-physics animation for Agentmou bot.
 * Triggers jump sequence on hover; respects prefers-reduced-motion.
 */
export function useAgentmouAnimation(
  charRef: RefObject<HTMLElement | null>,
  spotRef: RefObject<HTMLImageElement | null>
) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = () => setPrefersReducedMotion(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const charEl = charRef.current
    const spotEl = spotRef.current
    if (!charEl || !spotEl) return

    if (prefersReducedMotion) {
      return
    }

    const char = charEl
    const spot = spotEl

    const TIME_SCALE = 0.85
    const GRAVITY = 0.15
    const SQUASH_SX = 0.18
    const SQUASH_SY = 0.16
    const SPOT_SPEED = 0.055

    let spotAngle = 0

    class Spring {
      value: number
      target: number
      vel: number
      k: number
      d: number

      constructor(val: number, k: number, d: number) {
        this.value = val
        this.target = val
        this.vel = 0
        this.k = k
        this.d = d
      }

      step() {
        this.vel = (this.vel + (this.target - this.value) * this.k) * this.d
        this.value += this.vel
        return this.value
      }

      set(t: number) {
        this.target = t
      }

      impulse(v: number) {
        this.vel += v
      }
    }

    const scaleX = new Spring(1, 0.045, 0.83)
    const scaleY = new Spring(1, 0.045, 0.83)
    const posY = new Spring(0, 0.05, 0.84)
    const rotZ = new Spring(0, 0.018, 0.91)

    let rotYValue = 0
    let vy = 0
    let phase: string = 'idle'
    let phaseTime = 0
    let totalTime = 0
    let jumpCount = 0
    let jumpY = 0
    let rotYStart = 0
    let spinActive = false
    let spinElapsed = 0
    let spinDuration = 0
    let landStep = 0
    let hoverActive = false
    let canTrigger = true

    function easeInOutSine(t: number) {
      return -(Math.cos(Math.PI * t) - 1) / 2
    }

    function estimateRiseTime(v0: number) {
      let sv = v0
      let f = 0
      while (sv < 0) {
        sv += GRAVITY
        f++
      }
      return f * 16.67
    }

    const handleMouseEnter = () => {
      hoverActive = true
      if (phase === 'idle' && canTrigger) {
        canTrigger = false
        phase = 'anticipation'
        phaseTime = 0
      }
    }

    const handleMouseLeave = () => {
      hoverActive = false
    }

    charEl.addEventListener('mouseenter', handleMouseEnter)
    charEl.addEventListener('mouseleave', handleMouseLeave)

    function tick(dt: number) {
      dt *= TIME_SCALE
      phaseTime += dt
      totalTime += dt

      spotAngle = (spotAngle + SPOT_SPEED * dt) % 360
      spotEl!.style.setProperty('--spot', spotAngle + 'deg')

      if (spinActive) {
        spinElapsed += dt
        const p = Math.min(spinElapsed / spinDuration, 1)
        rotYValue = rotYStart + 360 * easeInOutSine(p)
        if (p >= 1) {
          rotYValue = rotYStart + 360
          spinActive = false
        }
      }

      switch (phase) {
        case 'idle': {
          const t1 = Math.sin(totalTime * 0.0016) * 0.03
          const t2 = Math.sin(totalTime * 0.0028) * 0.015
          scaleX.set(1 + t1 + t2)
          scaleY.set(1 - t1 - t2)
          posY.set(Math.sin(totalTime * 0.001) * 4)
          break
        }

        case 'anticipation': {
          const t = Math.min(phaseTime / 450, 1)
          const ease = t * t
          scaleX.set(1 + SQUASH_SX * ease)
          scaleY.set(1 - SQUASH_SY * ease)
          posY.set(12 * ease)
          if (phaseTime > 450) {
            phase = 'jump'
            phaseTime = 0
            vy = -5.2
            jumpY = 0
            jumpCount++
            rotYStart = rotYValue
            spinDuration = estimateRiseTime(vy)
            spinElapsed = 0
            spinActive = true
            scaleX.impulse(-0.04)
            scaleY.impulse(0.03)
            if (jumpCount % 2 === 0) rotZ.impulse(2)
            else rotZ.impulse(-1.5)
          }
          break
        }

        case 'jump': {
          vy += GRAVITY
          jumpY += vy
          const speed = Math.abs(vy)
          const norm = Math.min(speed / 5.2, 1)
          const sq = norm * 0.035
          scaleX.set(1 - sq)
          scaleY.set(1 + sq * 0.25)
          if (jumpY >= 0 && vy > 0) {
            jumpY = 0
            if (spinActive) {
              rotYValue = rotYStart + 360
              spinActive = false
            }
            scaleX.set(1 + SQUASH_SX * 1.0)
            scaleY.set(1 - SQUASH_SY * 1.0)
            posY.set(14)
            phase = 'cushion'
            phaseTime = 0
          }
          posY.value = jumpY
          posY.target = jumpY
          break
        }

        case 'cushion': {
          const t = Math.min(phaseTime / 250, 1)
          const recover = t * t
          scaleX.set(1 + SQUASH_SX * 1.0 * (1 - recover))
          scaleY.set(1 - SQUASH_SY * 1.0 * (1 - recover))
          posY.set(14 * (1 - recover))
          if (phaseTime > 250) {
            phase = 'land-charge'
            phaseTime = 0
          }
          break
        }

        case 'land-charge': {
          const t = Math.min(phaseTime / 250, 1)
          const ease = t * t
          scaleX.set(1 + SQUASH_SX * 0.5 * ease)
          scaleY.set(1 - SQUASH_SY * 0.5 * ease)
          posY.set(8 * ease)
          if (phaseTime > 250) {
            phase = 'landing'
            landStep = 1
            vy = -3.0
            jumpY = 0
            rotZ.set(-5)
            scaleX.impulse(-0.02)
            scaleY.impulse(0.015)
          }
          break
        }

        case 'landing': {
          vy += GRAVITY
          jumpY += vy
          if (jumpY >= 0 && vy > 0) {
            jumpY = 0
            landStep++
            if (landStep === 2) {
              rotZ.set(4)
              scaleX.set(1 + SQUASH_SX * 0.45)
              scaleY.set(1 - SQUASH_SY * 0.4)
              vy = -1.3
            } else if (landStep === 3) {
              rotZ.set(-2.5)
              scaleX.set(1 + SQUASH_SX * 0.25)
              scaleY.set(1 - SQUASH_SY * 0.2)
              vy = -0.8
            } else {
              rotZ.set(0)
              scaleX.set(1 + SQUASH_SX * 0.12)
              scaleY.set(1 - SQUASH_SY * 0.1)
              phase = 'settle'
              phaseTime = 0
            }
          }
          posY.value = jumpY
          posY.target = jumpY
          break
        }

        case 'settle': {
          scaleX.set(1)
          scaleY.set(1)
          posY.set(0)
          rotZ.set(0)
          if (phaseTime > 1600) {
            phase = 'idle'
            phaseTime = 0
            canTrigger = true
            if (hoverActive) {
              canTrigger = false
              phase = 'anticipation'
              phaseTime = 0
            }
          }
          break
        }
      }

      const cy = posY.step()
      const csx = scaleX.step()
      const csy = scaleY.step()
      const crz = rotZ.step()
      charEl!.style.transform = `translateY(${cy}px) rotateY(${rotYValue}deg) rotateZ(${crz}deg) scaleX(${csx}) scaleY(${csy})`
    }

    let lastTime = performance.now()
    let rafId: number

    function loop(now: number) {
      const dt = Math.min(now - lastTime, 32)
      lastTime = now
      tick(dt)
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    return () => {
      charEl.removeEventListener('mouseenter', handleMouseEnter)
      charEl.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(rafId)
    }
  }, [charRef, spotRef, prefersReducedMotion])
}
