"use client"

import { useContext, useEffect, useRef, useState } from "react"
import { HomeIntroContext } from "./HomeExperience"
import { heroFrameUrl } from "./hero-sequence"

type Props = {
  base: string
  first: number
  last: number
  introEnd: number
  initialFrame: number
}

type Phase = "buffer" | "intro" | "page" | "scroll"
const LOOK_AHEAD = 12
const MAX_CACHED_FRAMES = 36
const FRAME_MS = 1000 / 30
const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))

export default function PlanetSequence({ base, first, last, introEnd, initialFrame }: Props) {
  const region = useRef<HTMLDivElement>(null)
  const output = useRef<HTMLImageElement>(null)
  const [ready, setReady] = useState(false)
  const intro = useContext(HomeIntroContext)
  const playback = intro?.playback ?? "page"
  const onProgress = intro?.onProgress
  const onInitialReady = intro?.onReady
  const onIntroComplete = intro?.onIntroComplete
  const mode = useRef(playback)
  const reconcile = useRef<() => void>(() => {})

  useEffect(() => {
    mode.current = playback
    reconcile.current()
  }, [playback])

  useEffect(() => {
    const img = output.current
    const section = region.current
    if (!img || !section) return
    const url = (n: number) => heroFrameUrl(base, n)
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")
    if (img.complete && !img.naturalWidth) img.style.visibility = "hidden"
    if (reducedMotion.matches) {
      img.src = url(last)
      setReady(true)
      onProgress?.(100)
      onInitialReady?.()
      return
    }

    const cache = new Map<number, HTMLImageElement>()
    const pending = new Map<number, HTMLImageElement>()
    const timeouts = new Map<number, number>()
    const failed = new Set<number>()
    const settled = new Set<number>()
    const queue: number[] = []
    const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
    const pageBuffer = range(introEnd, Math.min(last, introEnd + LOOK_AHEAD))
    const introBuffer = [...new Set([...range(first, Math.min(introEnd, first + LOOK_AHEAD)), ...pageBuffer])]
    let disposed = false
    let announcedReady = false
    let introFinished = false
    let phase: Phase = "buffer"
    let current = initialFrame
    let timeline = initialFrame
    let wanted = initialFrame
    let lastStep = 0
    let frameRaf = 0
    let anchor = { distance: 0, frame: last }
    let direction = 1

    const distance = () => Math.max(0, -section.getBoundingClientRect().top)
    const scrollLength = () => Math.max(1, window.innerHeight * 1.25)
    const display = (n: number) => {
      const item = cache.get(n)
      if (!item || !item.complete || !item.naturalWidth) return false
      if (n !== current || !img.naturalWidth) img.src = item.src
      current = n
      return true
    }

    function enqueue(n: number, urgent = false) {
      if (n < first || n > last || cache.has(n) || pending.has(n) || failed.has(n)) return
      const index = queue.indexOf(n)
      if (index !== -1) {
        if (!urgent) return
        queue.splice(index, 1)
      }
      if (urgent) queue.unshift(n)
      else queue.push(n)
      pump()
    }

    function prepareWindow(center: number, reverse = false) {
      const min = Math.max(phase === "intro" ? first : introEnd, center - (reverse ? LOOK_AHEAD : 4))
      const max = Math.min(last, center + (reverse ? 4 : LOOK_AHEAD))
      // Cancel stale queued work when a fast scroll changes direction or jumps to an anchor.
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i] < min || queue[i] > max) queue.splice(i, 1)
      }
      enqueue(center, true)
      for (let offset = 1; offset <= LOOK_AHEAD; offset++) {
        const next = center + (reverse ? -offset : offset)
        if (next >= min && next <= max) enqueue(next)
      }
      for (let n = min; n <= max; n++) enqueue(n)
      if (cache.size > MAX_CACHED_FRAMES) {
        for (const key of cache.keys()) {
          const reservedForPage = phase === "intro" && pageBuffer.includes(key)
          if (key !== current && !reservedForPage && (key < min || key > max)) cache.delete(key)
        }
      }
    }

    function checkBuffer() {
      if (announcedReady) return
      const required = mode.current === "page" ? pageBuffer : introBuffer
      const count = required.filter(n => settled.has(n)).length
      onProgress?.(count / required.length * 100)
      if (count === required.length) {
        announcedReady = true
        setReady(true)
        onInitialReady?.()
      }
    }

    function pump() {
      while (!disposed && pending.size < 7 && queue.length > 0) {
        const n = queue.shift()!
        if (cache.has(n) || pending.has(n) || failed.has(n)) continue
        const image = new Image()
        image.decoding = "async"
        pending.set(n, image)
        let finished = false
        const finish = (success: boolean) => {
          if (finished) return
          finished = true
          window.clearTimeout(timeouts.get(n))
          timeouts.delete(n)
          image.onload = image.onerror = null
          pending.delete(n)
          if (disposed) return
          settled.add(n)
          if (success) {
            cache.set(n, image)
            if ((phase === "scroll" && n === wanted) || (phase === "buffer" && n === (mode.current === "page" ? introEnd : first))) display(n)
          } else {
            failed.add(n)
            image.removeAttribute("src")
            console.warn("Missing animation frame", n)
          }
          checkBuffer()
          syncPlayback()
          pump()
        }
        image.onload = () => finish(true)
        image.onerror = () => finish(false)
        timeouts.set(n, window.setTimeout(() => finish(false), 8000))
        image.src = url(n)
      }
    }

    function startSegment(next: "intro" | "page") {
      cancelAnimationFrame(frameRaf)
      phase = next
      timeline = next === "intro" ? first : introEnd
      wanted = timeline
      display(timeline)
      prepareWindow(timeline)
      lastStep = performance.now()
      frameRaf = requestAnimationFrame(tick)
    }

    function syncPlayback() {
      if (disposed || mode.current === "hold" || reducedMotion.matches) return
      if (mode.current === "page" && (phase === "intro" || phase === "buffer")) {
        // Free loader slots immediately when Skip or the watchdog bypasses intro.
        for (const [n, image] of pending) {
          if (n >= introEnd) continue
          image.onload = image.onerror = null
          image.removeAttribute("src")
          pending.delete(n)
          window.clearTimeout(timeouts.get(n))
          timeouts.delete(n)
        }
        for (let i = queue.length - 1; i >= 0; i--) {
          if (queue[i] < introEnd) queue.splice(i, 1)
        }
        for (const n of pageBuffer) enqueue(n)
        pump()
      }
      checkBuffer()
      if (mode.current === "page" && phase === "intro") {
        startSegment("page") // Skip intro also skips the planet's first segment.
      } else if (phase === "buffer" && announcedReady) {
        if (mode.current === "intro" && !introFinished) startSegment("intro")
        if (mode.current === "page") {
          if (distance() > 1) {
            phase = "scroll"
            update()
          } else startSegment("page")
        }
      }
    }
    reconcile.current = syncPlayback

    function tick(time: number) {
      if (disposed || (phase !== "intro" && phase !== "page") || reducedMotion.matches) return
      const end = phase === "intro" ? introEnd : last
      const elapsed = time - lastStep
      if (elapsed >= FRAME_MS) {
        // A background tab or late frame must not skip the entire camera move.
        const target = Math.min(end, timeline + Math.min(3, Math.floor(elapsed / FRAME_MS)))
        if (display(target) || failed.has(target)) {
          timeline = target
          lastStep = time - elapsed % FRAME_MS
          prepareWindow(timeline)
          if (timeline === end) {
            if (phase === "intro") {
              introFinished = true
              phase = "buffer"
              onIntroComplete?.()
            } else {
              phase = "scroll"
              anchor = { distance: 0, frame: last }
              update()
            }
            return
          }
        } else {
          enqueue(target, true)
          lastStep = time
        }
      }
      frameRaf = requestAnimationFrame(tick)
    }

    function update() {
      if (disposed || reducedMotion.matches || (phase !== "page" && phase !== "scroll")) return
      const travelled = distance()
      if (phase === "page") {
        if (travelled <= 1) return
        // Start reversing from the visible frame if the visitor scrolls during autoplay.
        cancelAnimationFrame(frameRaf)
        phase = "scroll"
        anchor = { distance: travelled, frame: current }
      }
      const previous = wanted
      const frame = anchor.distance > 0 && travelled < anchor.distance
        ? last - (last - anchor.frame) * travelled / anchor.distance
        : anchor.frame - (travelled - anchor.distance) / scrollLength() * (last - introEnd)
      wanted = clamp(Math.round(frame), introEnd, last)
      direction = Math.sign(wanted - previous) || direction
      display(wanted)
      prepareWindow(wanted, direction < 0)
    }

    const onMotionChange = () => {
      if (!reducedMotion.matches) return
      cancelAnimationFrame(frameRaf)
      phase = "scroll"
      wanted = last
      img.src = url(last)
    }
    for (const n of mode.current === "page" ? pageBuffer : introBuffer) enqueue(n)
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    reducedMotion.addEventListener("change", onMotionChange)
    return () => {
      disposed = true
      reconcile.current = () => {}
      cancelAnimationFrame(frameRaf)
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      reducedMotion.removeEventListener("change", onMotionChange)
      for (const image of pending.values()) image.onload = image.onerror = null
      for (const timeout of timeouts.values()) window.clearTimeout(timeout)
      timeouts.clear()
      cache.clear()
      pending.clear()
      queue.length = 0
    }
  }, [base, first, last, introEnd, initialFrame, onProgress, onInitialReady, onIntroComplete])

  return (
    <div ref={region} className="planet-scroll" aria-hidden="true">
      <div className="planet-sticky">
        <img ref={output} src={heroFrameUrl(base, initialFrame)} alt="" draggable={false}
          onError={event => { event.currentTarget.style.visibility = "hidden" }}
          onLoad={event => { event.currentTarget.style.visibility = "visible" }} />
        <div className="planet-vignette" />
        {!ready && <span className="sr-only">Preparing animation</span>}
      </div>
    </div>
  )
}
