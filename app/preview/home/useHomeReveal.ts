"use client"

import { useEffect } from "react"
import type { RefObject } from "react"

export type RevealOptions = {
  from: "left" | "right" | "top" | "bottom"
  order: number
}

const SELECTOR = "[data-reveal]"
const EASING = "cubic-bezier(.22, 1, .36, 1)"
const DURATION = { text: 660, frame: 780, line: 800 }
const STAGGER_MS = 110

export function useHomeReveal(container: RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = container.current
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!root || !enabled || motion.matches || !("IntersectionObserver" in window) || !Element.prototype.animate) return

    const targets = Array.from(root.querySelectorAll<HTMLElement>(SELECTOR))
    const pending = new Set<HTMLElement>()
    const animations = new Map<HTMLElement, { animation: Animation; willChange: string }>()

    function finish(element: HTMLElement) {
      const running = animations.get(element)
      element.dataset.revealState = "done"
      pending.delete(element)
      observer.unobserve(element)
      if (running) {
        animations.delete(element)
        running.animation.cancel()
        element.style.willChange = running.willChange
      }
    }

    function reveal(element: HTMLElement, immediate = false) {
      if (immediate) {
        finish(element)
        return
      }
      if (!pending.delete(element)) return
      observer.unobserve(element)
      const preset = element.dataset.reveal as keyof typeof DURATION
      const order = Math.max(0, Number(element.dataset.revealOrder) || 0)
      const willChange = element.style.willChange
      const from = preset === "line"
        ? { opacity: 0, scale: "0 1" }
        : { opacity: 0, translate: "var(--home-reveal-x, 0px) var(--home-reveal-y, 18px)" }
      const to = preset === "line" ? { opacity: 1, scale: "1 1" } : { opacity: 1, translate: "0px 0px" }
      element.dataset.revealState = "running"
      element.style.willChange = preset === "line" ? "opacity, scale" : "opacity, translate"
      try {
        const animation = element.animate([from, to], {
          duration: DURATION[preset] ?? DURATION.text,
          delay: Math.min(order, 3) * STAGGER_MS,
          easing: EASING,
          fill: "both",
        })
        animations.set(element, { animation, willChange })
        void animation.finished.then(() => {
          if (animations.get(element)?.animation === animation) finish(element)
        }).catch(() => {})
      } catch {
        element.style.willChange = willChange
        finish(element)
      }
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) reveal(entry.target as HTMLElement)
        else if (entry.boundingClientRect.bottom < 0) reveal(entry.target as HTMLElement, true)
      }
    }, { rootMargin: "0px 0px -48px 0px", threshold: 0 })

    root.dataset.homeMotion = "enabled"
    for (const element of targets) {
      const rect = element.getBoundingClientRect()
      // Keep restored positions and deep links visible instead of hiding painted content.
      if (rect.top < window.innerHeight || element.contains(document.activeElement)) {
        element.dataset.revealState = "done"
        continue
      }
      element.dataset.revealState = "pending"
      pending.add(element)
      observer.observe(element)
    }

    const onFocus = (event: FocusEvent) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>(SELECTOR) : null
      if (element && root.contains(element)) reveal(element, true)
    }
    const showAll = () => {
      observer.disconnect()
      for (const element of targets) finish(element)
      delete root.dataset.homeMotion
    }
    const onMotionChange = () => { if (motion.matches) showAll() }
    root.addEventListener("focusin", onFocus)
    motion.addEventListener("change", onMotionChange)

    return () => {
      showAll()
      for (const element of targets) delete element.dataset.revealState
      root.removeEventListener("focusin", onFocus)
      motion.removeEventListener("change", onMotionChange)
    }
  }, [container, enabled])
}
