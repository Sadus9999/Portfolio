import Link from "next/link"
import { ChevronRightIcon } from "@heroicons/react/20/solid"
import { useId } from "react"
import type { RevealOptions } from "./useHomeReveal"

export type MediaCardVariant = "case" | "portfolio"

type Props = {
  variant: MediaCardVariant
  className?: string
  href: string
  image: string
  title: string
  description?: string
  external?: boolean
  reveal?: RevealOptions
}

export default function MediaCard({ variant, className = "", href, image, title, description, external = false, reveal }: Props) {
  const id = useId()
  const titleId = `${id}-title`
  const descriptionId = description ? `${id}-description` : undefined
  const linkProps = {
    href,
    className: `media-frame media-card media-card--${variant} ${className}`.trim(),
    "aria-labelledby": titleId,
    "aria-describedby": descriptionId,
    "data-reveal": reveal ? "frame" : undefined,
    "data-reveal-from": reveal?.from,
    "data-reveal-order": reveal?.order,
  }
  const body = (
    <>
      <img src={image} alt="" loading="lazy" />
      <span className="media-card-caption">
        <span className="media-card-copy">
          <strong className="media-card-title" id={titleId}>{title}</strong>
          {description && <span className="media-card-description" id={descriptionId}>{description}</span>}
        </span>
        {variant === "case" && (
          <span className="media-card-chevron" aria-hidden="true">
            <ChevronRightIcon width={20} height={20} />
          </span>
        )}
      </span>
    </>
  )

  return external
    ? <a {...linkProps} target="_blank" rel="noopener noreferrer">{body}</a>
    : <Link {...linkProps}>{body}</Link>
}
