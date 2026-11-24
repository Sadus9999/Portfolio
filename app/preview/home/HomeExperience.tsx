"use client"

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import IntroLogo, { INTRO_FLIGHT_MS } from "./IntroLogo"
import { INTRO_SESSION_COOKIE, INTRO_SESSION_VALUE } from "./intro-session"

type IntroPhase = "checking" | "loading" | "flying" | "revealing" | "ready"

export const HomeIntroContext = createContext<{
  paused: boolean
  onProgress: (value: number) => void
  onReady: () => void
} | null>(null)

function hasSeenIntro() {
  try {
    if (document.cookie.split(";").some(cookie => cookie.trim() === `${INTRO_SESSION_COOKIE}=${INTRO_SESSION_VALUE}`)) return true
  } catch {
    // Storage can still work when a browser blocks cookie access.
  }
  try {
    return sessionStorage.getItem(INTRO_SESSION_COOKIE) === INTRO_SESSION_VALUE
  } catch {
    return false
  }
}

function rememberIntro() {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${INTRO_SESSION_COOKIE}=${INTRO_SESSION_VALUE}; Path=/; SameSite=Lax${secure}`
    if (document.cookie.split(";").some(cookie => cookie.trim() === `${INTRO_SESSION_COOKIE}=${INTRO_SESSION_VALUE}`)) return
  } catch {
    // Session storage also supports browsers that block first-party cookies.
  }
  try {
    sessionStorage.setItem(INTRO_SESSION_COOKIE, INTRO_SESSION_VALUE)
  } catch {
    // Storage restrictions must not block the first visit.
  }
}

export default function HomeExperience({ introEnabled, children }: { introEnabled: boolean; children: ReactNode }) {
  const [phase, setPhase] = useState<IntroPhase>(introEnabled ? "checking" : "ready")
  const [progress, setProgress] = useState(0)
  const [assetsReady, setAssetsReady] = useState(false)
  const [logoReady, setLogoReady] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)
  const [minimumElapsed, setMinimumElapsed] = useState(false)
  const content = useRef<HTMLDivElement>(null)
  const skipButton = useRef<HTMLButtonElement>(null)
  const started = useRef(false)
  const visible = phase === "checking" || phase === "loading" || phase === "flying"
  const blocking = phase === "loading" || phase === "flying"

  const skip = useCallback(() => setPhase("ready"), [])
  const onLogoReady = useCallback(() => setLogoReady(true), [])
  const onFlightComplete = useCallback(() => setPhase(current => current === "flying" ? "revealing" : current), [])
  const onProgress = useCallback((value: number) => {
    if (introEnabled) setProgress(Math.max(0, Math.min(100, Math.round(value))))
  }, [introEnabled])
  const onReady = useCallback(() => {
    if (introEnabled) setAssetsReady(true)
  }, [introEnabled])
  const controls = useMemo(() => ({ paused: visible, onProgress, onReady }), [visible, onProgress, onReady])

  useEffect(() => {
    if (!introEnabled || (!started.current && hasSeenIntro())) {
      if (!introEnabled) started.current = false
      setPhase("ready")
      return
    }
    started.current = true
    rememberIntro()
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (motion.matches || (window.location.hash && window.location.hash !== "#top")) {
      setPhase("ready")
      return
    }
    setProgress(0)
    setAssetsReady(false)
    setLogoReady(false)
    setFontsReady(false)
    setMinimumElapsed(false)
    setPhase("loading")
    let disposed = false
    void document.fonts.ready.then(() => { if (!disposed) setFontsReady(true) })
    const minimum = window.setTimeout(() => setMinimumElapsed(true), 900)
    const watchdog = window.setTimeout(() => {
      setPhase(current => current === "loading" || current === "checking" ? "ready" : current)
    }, 12000)
    const onMotionChange = () => { if (motion.matches) skip() }
    motion.addEventListener("change", onMotionChange)
    return () => {
      disposed = true
      window.clearTimeout(minimum)
      window.clearTimeout(watchdog)
      motion.removeEventListener("change", onMotionChange)
    }
  }, [introEnabled, skip])

  useEffect(() => {
    if (phase === "loading" && assetsReady && logoReady && fontsReady && minimumElapsed) setPhase("flying")
  }, [phase, assetsReady, logoReady, fontsReady, minimumElapsed])

  useEffect(() => {
    if (phase !== "revealing") return
    const timeout = window.setTimeout(() => setPhase("ready"), 1400)
    return () => window.clearTimeout(timeout)
  }, [phase])

  useEffect(() => {
    const element = content.current
    if (!blocking || !element) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.documentElement.style.overflow
    const previousGutter = document.documentElement.style.scrollbarGutter
    element.inert = true
    document.documentElement.style.scrollbarGutter = "stable"
    document.documentElement.style.overflow = "hidden"
    window.scrollTo(0, 0)
    skipButton.current?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") skip()
      if (event.key === "Tab") {
        event.preventDefault()
        skipButton.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      element.inert = false
      document.documentElement.style.overflow = previousOverflow
      document.documentElement.style.scrollbarGutter = previousGutter
      document.removeEventListener("keydown", onKeyDown)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [blocking, skip])

  return (
    <HomeIntroContext.Provider value={controls}>
      <div className="home-experience" data-intro-phase={phase}>
        {visible && <div className="home-intro" data-phase={phase} role="dialog" aria-modal="true" aria-label="Preparing the DEMIGOD portfolio"
          style={{ "--intro-flight-duration": `${INTRO_FLIGHT_MS}ms` } as CSSProperties}>
          <div className="home-intro-backdrop" />
          <div className="home-intro-scene" aria-hidden="true">
            <IntroLogo flying={phase === "flying"} onReady={onLogoReady} onFlightComplete={onFlightComplete} />
          </div>
          <div className="home-intro-progress">
            <span aria-hidden="true">{progress}%</span>
            <div className="home-intro-track" role="progressbar" aria-label="Loading the planet animation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
          </div>
          <button ref={skipButton} type="button" className="home-pill home-intro-skip" onClick={skip}>Skip intro</button>
        </div>}
        <div ref={content} className="home-content" aria-hidden={blocking || undefined}>{children}</div>
        <noscript><style>{".home-intro{display:none!important}"}</style></noscript>
      </div>
    </HomeIntroContext.Provider>
  )
}
