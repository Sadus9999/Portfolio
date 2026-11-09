"use client"

import { useRef } from "react"

const links = [
  { href: "#top", label: "Home" },
  { href: "#about", label: "About me" },
  { href: "#case-studies", label: "Case Studies" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#contact", label: "Contact" },
]

export default function MobileMenu() {
  const details = useRef<HTMLDetailsElement>(null)
  return (
    <details className="home-mobile-nav" ref={details}>
      <summary aria-label="Toggle navigation">Menu</summary>
      <nav aria-label="Mobile navigation">
        {links.map(({ href, label }) => (
          <a key={href} href={href} onClick={() => { if (details.current) details.current.open = false }}>
            {label}
          </a>
        ))}
      </nav>
    </details>
  )
}
