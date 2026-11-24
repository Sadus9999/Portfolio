"use client"

import { useCallback, useEffect, useRef } from "react"

export const INTRO_FLIGHT_MS = 1600
const CAMERA_DEPTH = 900

type Props = {
  flying: boolean
  onReady: () => void
  onFlightComplete: () => void
}

export default function IntroLogo({ flying, onReady, onFlightComplete }: Props) {
  const plane = useRef<HTMLDivElement>(null)
  const geometry = useRef({ width: 174, height: 26 })
  const available = useRef(false)

  const placeLogo = useCallback(() => {
    const element = plane.current
    if (!element) return 1
    const { width, height } = geometry.current
    const scale = Math.min(520, window.innerWidth * .72) / width
    element.style.transformOrigin = `${width / 2}px ${height / 2}px`
    element.style.transform = `translateZ(0) scale(${scale})`
    return scale
  }, [])

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
        geometry.current = { width: viewBox.width, height: viewBox.height }
        placeLogo()
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
  }, [onReady, placeLogo])

  useEffect(() => {
    const element = plane.current
    if (!element) return
    let animation: Animation | undefined

    const scale = placeLogo()
    if (!flying) {
      window.addEventListener("resize", placeLogo)
      return () => window.removeEventListener("resize", placeLogo)
    }
    if (!available.current || !element.animate) {
      onFlightComplete()
      return
    }

    const transform = (depth: number) => `translateZ(${depth}px) scale(${scale})`
    animation = element.animate([
      { transform: transform(0), offset: 0 },
      { transform: transform(120), offset: .3 },
      { transform: transform(650), offset: .75 },
      { transform: transform(CAMERA_DEPTH * 1.08), offset: 1 },
    ], {
      duration: INTRO_FLIGHT_MS,
      easing: "cubic-bezier(.55, .05, .8, .45)",
      fill: "forwards",
    })
    void animation.finished.then(onFlightComplete).catch(() => {})
    return () => animation?.cancel()
  }, [flying, onFlightComplete, placeLogo])

  return <div className="home-intro-logo"><div className="home-intro-logo-plane" ref={plane} /></div>
}
