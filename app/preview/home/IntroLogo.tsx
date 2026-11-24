"use client"

import { useEffect, useRef } from "react"

export const INTRO_FLIGHT_MS = 1600
const CAMERA_DEPTH = 900

type Props = {
  flying: boolean
  onReady: () => void
  onFlightComplete: () => void
}

export default function IntroLogo({ flying, onReady, onFlightComplete }: Props) {
  const plane = useRef<HTMLDivElement>(null)
  const geometry = useRef({ width: 174, height: 26, gap: 87 })
  const available = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    let disposed = false
    const timeout = window.setTimeout(() => controller.abort(), 6000)

    async function loadLogo() {
      try {
        const response = await fetch("/home/demigod-wordmark.svg", { signal: controller.signal })
        if (!response.ok) throw new Error("The intro logo is unavailable")
        const source = await response.text()
        if (controller.signal.aborted || !plane.current) return

        const logoDocument = new DOMParser().parseFromString(source, "image/svg+xml")
        const svg = logoDocument.documentElement
        if (!(svg instanceof SVGSVGElement)) throw new Error("Invalid intro logo")
        svg.setAttribute("aria-hidden", "true")
        svg.setAttribute("focusable", "false")
        plane.current.replaceChildren(svg)

        const viewBox = svg.viewBox.baseVal
        const boxes = Array.from(svg.querySelectorAll("path"))
          .map(path => path.getBBox())
          .sort((left, right) => left.x - right.x)
        const letters: Array<{ left: number; right: number }> = []
        for (const box of boxes) {
          const previous = letters.at(-1)
          if (previous && box.x <= previous.right) {
            previous.right = Math.max(previous.right, box.x + box.width)
          } else {
            letters.push({ left: box.x, right: box.x + box.width })
          }
        }
        const center = viewBox.x + viewBox.width / 2
        const gaps = letters.slice(1).map((letter, index) => (letters[index].right + letter.left) / 2)
        gaps.sort((left, right) => Math.abs(left - center) - Math.abs(right - center))
        geometry.current = { width: viewBox.width, height: viewBox.height, gap: gaps[0] ?? center }
        available.current = true
      } catch {
        // A failed decorative asset must not prevent the homepage from opening.
      } finally {
        window.clearTimeout(timeout)
        if (!disposed) onReady()
      }
    }

    void loadLogo()
    return () => {
      disposed = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [onReady])

  useEffect(() => {
    const element = plane.current
    if (!element) return
    let animation: Animation | undefined

    const placeLogo = () => {
      const { width, height, gap } = geometry.current
      const scale = Math.min(520, window.innerWidth * .72) / width
      const offset = (scale - 1) * (gap - width / 2)
      element.style.transformOrigin = `${gap}px ${height / 2}px`
      element.style.transform = `translate3d(${offset}px, 0, 0) scale(${scale})`
      return { width, scale, offset, gap }
    }

    const initial = placeLogo()
    if (!flying) {
      window.addEventListener("resize", placeLogo)
      return () => window.removeEventListener("resize", placeLogo)
    }
    if (!available.current || !element.animate) {
      onFlightComplete()
      return
    }

    const target = initial.width / 2 - initial.gap
    const transform = (offset: number, depth: number) =>
      `translate3d(${offset}px, 0, ${depth}px) scale(${initial.scale})`
    animation = element.animate([
      { transform: transform(initial.offset, 0), offset: 0 },
      { transform: transform(target, 120), offset: .3 },
      { transform: transform(target, 650), offset: .75 },
      { transform: transform(target, CAMERA_DEPTH * 1.08), offset: 1 },
    ], {
      duration: INTRO_FLIGHT_MS,
      easing: "cubic-bezier(.55, .05, .8, .45)",
      fill: "forwards",
    })
    void animation.finished.then(onFlightComplete).catch(() => {})
    return () => animation?.cancel()
  }, [flying, onFlightComplete])

  return <div className="home-intro-logo"><div className="home-intro-logo-plane" ref={plane} /></div>
}
