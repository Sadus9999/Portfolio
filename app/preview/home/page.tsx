import type { Metadata } from "next"
import Link from "next/link"
import { loadGallery } from "@/lib/r2"
import { loadSiteContent } from "@/lib/site-content"
import PlanetSequence from "./PlanetSequence"
import MobileMenu from "./MobileMenu"
import MediaCard from "./MediaCard"
import "./home.css"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const c = await loadSiteContent()
  return { title: c.seo.title, description: c.seo.description }
}

const highlightPattern = /(6 years of experience|15 years in digital design|limited time and budget|e-commerce|design systems|UX principles)/gi
function HighlightedStatement({ value }: { value: string }) {
  return <>{value.split(highlightPattern).map((part, i) =>
    /^(6 years of experience|15 years in digital design|limited time and budget|e-commerce|design systems|UX principles)$/i.test(part)
      ? <strong key={i} className="home-accent">{part}</strong>
      : <span key={i}>{part}</span>
  )}</>
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="home-section-heading"><h2>{children}</h2><div className="home-divider" /></div>
}

export default async function PreviewHomePage() {
  const content = await loadSiteContent()
  const gallery = await loadGallery().catch(() => ({ items: [] }))
  const published = gallery.items.filter(x => x.published).sort((a,b) => a.order - b.order)
  const selected = content.featuredWorkIds.map(id => published.find(item => item.id === id)).filter((x): x is (typeof published)[number] => !!x)
  const originalFigmaWorks = [
    { id: "orla", title: "Logo Orla Technologies", client: "Orla Technologies", thumbnail: "/home/work-orla.png", full: "/home/work-orla.png" },
    { id: "pebblify", title: "Pebblify Mobile App", client: "Pebblify", thumbnail: "/home/work-pebblify.png", full: "/home/work-pebblify.png" },
    { id: "outdoor", title: "Advertising on buses", client: "Outdoor", thumbnail: "/home/work-bus.png", full: "/home/work-bus.png" },
    { id: "web", title: "Web Design", client: "Digital Design", thumbnail: "/home/work-feature-05.png", full: "/home/work-feature-05.png" },
    { id: "visual", title: "Digital visual", client: "Digital Design", thumbnail: "/home/work-feature-04.png", full: "/home/work-feature-04.png" },
  ]
  const works = content.featuredWorkIds.length ? selected : originalFigmaWorks
  const h = content.hero
  return (
    <main className="demigod-home">
      <header className="home-header">
        <Link href="/preview/home" className="home-logo" aria-label="DEMIGOD homepage">
          <img src="/home/demigod-wordmark.svg" alt="DEMIGOD" />
        </Link>
        <nav className="home-nav" aria-label="Main navigation">
          <a href="#top">Home</a><a href="#about">About me</a>
          <a href="#case-studies">Case Studies</a><a href="#portfolio">Portfolio</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="home-pill header-cta" href="#contact">Let&apos;s talk</a>
        <MobileMenu />
      </header>

      <section className="home-hero" id="top">
        <PlanetSequence base={h.sequenceBase} first={h.firstFrame} last={h.lastFrame} autoplayEnd={h.autoplayEnd}/>
        <div className="hero-content">
          <p className="hero-note hero-note-left">{h.leftNote}</p>
          <p className="hero-note hero-note-right">{h.rightNote}</p>
          <div className="hero-headline">
            <p className="hero-eyebrow">{h.eyebrow}</p>
            <h1><span>{h.headlineTop}</span><em>{h.headlineBottom}</em></h1>
            <a className="home-pill hero-cta" href="#case-studies">{h.cta}</a>
          </div>
        </div>
      </section>

      <section className="home-section home-about" id="about">
        <Heading>About me</Heading>
        <p className="home-statement"><HighlightedStatement value={content.about.statement}/></p>
        <Link href="/about" className="home-pill home-center-cta">{content.about.cta}</Link>
      </section>

      <section className="home-section home-services">
        <Heading>What I do?</Heading>
        <div className="service-grid">
          {content.services.map(service => (
            <article className="service-card media-frame" key={service.id}>
              {service.image && <img src={service.image} alt="" />}
              <div className="service-info">
                <h3>{service.title}</h3><p>{service.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-cases" id="case-studies">
        <div className="home-heading-row"><Heading>Case Studies</Heading><Link href="/case-studies">See more ›</Link></div>
        <div className="case-grid">
          {content.caseStudies.map((item, i) => (
            <MediaCard
              key={item.id}
              variant="case"
              className={"case-card case-card-" + i}
              href={item.href}
              image={item.image}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </section>

      <section className="home-section home-works" id="portfolio">
        <Heading>Portfolio</Heading>
        <h2 className="home-works-title"><span>BEST</span><span>WORKS</span></h2>
        <div className="works-grid">
          {works.slice(0,5).map((item, i) => (
            <MediaCard
              key={item.id}
              variant="portfolio"
              className={"work-tile work-tile-" + i}
              href={item.full}
              image={item.thumbnail || item.full}
              title={item.title || item.client}
              description={item.client}
              external
            />
          ))}
          <Link href="/portfolio" className="home-pill works-cta">SEE ALL WORKS</Link>
        </div>
      </section>

      <section className="home-section home-capabilities">
        <p className="home-statement"><HighlightedStatement value={content.capabilities.statement}/></p>
        <div className="capabilities-content">
          <div className="capabilities-grid">
            {content.capabilities.columns.map(col => (
              <div key={col.title}><h3>{col.title}</h3>
                {col.items.map(item => <p key={item}>{item}</p>)}
              </div>
            ))}
          </div>
          {content.capabilities.cvUrl && <a className="home-pill" href={content.capabilities.cvUrl}>Download CV</a>}
        </div>
      </section>

      <section className="home-section home-contact" id="contact">
        <Heading>Contact me</Heading>
        <p className="contact-eyebrow">{content.contact.eyebrow}</p>
        <a className="contact-mail" href={"mailto:"+content.contact.email}>{content.contact.email}</a>
      </section>
      <footer className="home-footer">
        <img src="/home/demigod-wordmark.svg" alt="DEMIGOD" />
        <div className="footer-bottom">
          <div className="footer-socials"><a href="https://www.linkedin.com/in/michal-okon/" target="_blank" rel="noopener noreferrer">in</a><a href="https://dribbble.com/Michal_Okon" target="_blank" rel="noopener noreferrer">◉</a><a href="https://www.behance.net/michalokon" target="_blank" rel="noopener noreferrer">Bē</a></div>
          <p>© {new Date().getFullYear()} DEMIGOD. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
