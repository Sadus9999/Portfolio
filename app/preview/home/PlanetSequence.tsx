"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  base: string
  first: number
  last: number
  autoplayEnd: number
}

const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))

export default function PlanetSequence({ base, first, last, autoplayEnd }: Props) {
  const region = useRef<HTMLDivElement>(null)
  const output = useRef<HTMLImageElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const img = output.current
    const section = region.current
    if (!img || !section) return

    const url = (n: number) => base.replace(/\/?$/, "/") + n + ".webp"
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reducedMotion) {
      img.src = url(first)
      setReady(true)
      return
    }

    const cache = new Map<number, HTMLImageElement>()
    const pending = new Set<number>()
    const queue: number[] = []
    let active = 0
    let disposed = false
    let phase: "buffer" | "play" | "scroll" = "buffer"
    let current = first
    let frameRaf = 0
    let start = 0
    let elapsedFrames = 0
    let wanted = first

    const display = (n: number) => {
      const item = cache.get(n)
      if (!item || !item.complete || !item.naturalWidth || !output.current) return false
      if (n !== current || !output.current.src) {
        output.current.src = item.src
        current = n
      }
      return true
    }

    const enqueue = (n: number, urgent = false) => {
      if (n < first || n > last || cache.has(n) || pending.has(n) || queue.includes(n)) return
      if (urgent) queue.unshift(n)
      else queue.push(n)
      pump()
    }

    const pump = () => {
      while (!disposed && active < 7 && queue.length > 0) {
        const n = queue.shift()!
        if (cache.has(n) || pending.has(n)) continue
        pending.add(n)
        active++
        const image = new Image()
        image.decoding = "async"
        const finish = (success: boolean) => {
          active--
          pending.delete(n)
          if (disposed) return
          if (success) {
            cache.set(n, image)
            if (n === first && phase === "buffer") display(first)
            if (phase === "scroll" && n === wanted) display(n)
          } else {
            console.warn("Missing animation frame", n)
          }
          const loadedIntro = Array.from({ length: autoplayEnd - first + 1 }, (_, i) => first + i)
            .every(i => cache.has(i))
          if (phase === "buffer" && loadedIntro) {
            phase = "play"
            setReady(true)
            start = performance.now()
            frameRaf = requestAnimationFrame(tick)
          }
          pump()
        }
        image.onload = () => finish(true)
        image.onerror = () => finish(false)
        image.src = url(n)
      }
    }

    function tick(time: number) {
      if (disposed || phase !== "play") return
      const target = clamp(first + Math.floor((time - start) * 0.03), first, autoplayEnd)
      if (!display(target)) {
        enqueue(target, true)
        start = time - (current - first) / 0.03
      }
      for (let i = current + 1; i <= Math.min(last, current + 12); i++) enqueue(i)
      if (current >= autoplayEnd) {
        phase = "scroll"
        update()
        return
      }
      frameRaf = requestAnimationFrame(tick)
    }

    function update() {
      if (phase !== "scroll" || disposed || !region.current) return
      const rect = region.current.getBoundingClientRect()
      const length = Math.max(1, rect.height - innerHeight)
      const p = clamp(-rect.top / length, 0, 1)
      wanted = clamp(autoplayEnd + Math.round(p * (last - autoplayEnd)), autoplayEnd, last)
      if (!display(wanted)) {
        enqueue(wanted, true)
        // Keep the previous visible frame until the exact target loads.
      }
      for (let i = wanted - 10; i <= wanted + 15; i++) enqueue(i)
      if (cache.size > 100) {
        for (const key of cache.keys()) {
          if (key !== current && Math.abs(key - wanted) > 45) cache.delete(key)
        }
      }
    }

    for (let i = first; i <= autoplayEnd; i++) enqueue(i)
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      disposed = true
      cancelAnimationFrame(frameRaf)
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      cache.clear()
      queue.length = 0
    }
  }, [base, first, last, autoplayEnd])

  return (
    <div ref={region} className="planet-scroll" aria-hidden="true">
      <div className="planet-sticky">
        <img ref={output} src={base.replace(/\/?$/, "/") + first + ".webp"} alt="" draggable={false} />
        <div className="planet-vignette" />
        {!ready && <span className="sr-only">Preparing animation</span>}
      </div>
    </div>
  )
}
