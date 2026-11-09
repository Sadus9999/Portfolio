import Link from "next/link"
import type { ReactNode } from "react"

export type MediaCardVariant = "case" | "portfolio"

type Props = {
  variant: MediaCardVariant
  className?: string
  href: string
  image: string
  title: string
  description?: string
  external?: boolean
}

function Chevron() {
  return (
    <span className="media-card-chevron" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="m7 4 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  )
}

export default function MediaCard({ variant, className = "", href, image, title, description, external = false }: Props) {
  const body: ReactNode = (
    <>
      <img src={image} alt="" loading="lazy" />
      <span className="media-card-caption">
        <span className="media-card-copy">
          <strong>{title}</strong>
          {description && <small>{description}</small>}
        </span>
        {variant === "case" && <Chevron />}
      </span>
    </>
  )

  const styles = `media-frame media-card media-card--${variant} ${className}`.trim()

  return external
    ? <a href={href} className={styles} target="_blank" rel="noopener noreferrer" aria-label={[title, description].filter(Boolean).join(" — ")}>{body}</a>
    : <Link href={href} className={styles} aria-label={[title, description].filter(Boolean).join(" — ")}>{body}</Link>
}
