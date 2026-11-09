import type { Metadata } from "next"
import Link from "next/link"
import { loadGallery } from "@/lib/r2"
import { loadSiteContent } from "@/lib/site-content"
import PlanetSequence from "./PlanetSequence"
import "./home.css"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const c = await loadSiteContent()
  return { title: c.seo.title, description: c.seo.description }
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="home-section-heading"><h2>{children}</h2><div className="home-divider" /></div>
}

export default async function PreviewHomePage() {
  const content = await loadSiteContent()
  const gallery = await loadGallery().catch(() => ({ items: [] }))
  const published = gallery.items.filter(x => x.published).sort((a,b) => a.order - b.order)
  const featured = content.featuredWorkIds.length
    ? content.featuredWorkIds.map(id => published.find(item => item.id === id)).filter((x): x is (typeof published)[number] => !!x)
    : published.filter(item => item.showInWidget).slice(0, 5)
  const works = featured.length ? featured : published.slice(0, 5)
  const h = content.hero
  return (
    <main className="demigod-home">
      <header className="home-header">
        <Link href="/preview/home" className="home-logo" aria-label="DEMIGOD homepage">
          <img src="/demigod-logo.svg" alt="DEMIGOD" />
        </Link>
        <nav className="home-nav" aria-label="Main navigation">
          <a href="#top">Home</a><a href="#about">About me</a>
          <a href="#case-studies">Case Studies</a><a href="#portfolio">Portfolio</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="home-pill header-cta" href="#contact">Let&apos;s talk</a>
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
        <p className="home-statement">{content.about.statement}</p>
        <Link href="/about" className="home-pill home-center-cta">{content.about.cta}</Link>
      </section>

      <section className="home-section home-services">
        <Heading>What I do?</Heading>
        <div className="service-grid">
          {content.services.map(service => (
            <article className="service-card" key={service.id}>
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
            <Link className={"case-card case-card-" + i} key={item.id} href={item.href}>
              {item.image && <img src={item.image} alt={item.title}/>}
              <div className="case-label">{item.category}</div>
              <span className="case-name">{item.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section home-works" id="portfolio">
        <Heading>Portfolio</Heading>
        <h2 className="home-works-title"><span>BEST</span> WORKS</h2>
        <div className="works-grid">
          {works.slice(0,5).map((item, i) => (
            <a key={item.id} className={"work-tile work-tile-"+i} href={item.full} target="_blank" rel="noopener noreferrer">
              <img src={item.thumbnail || item.full} alt={item.title || item.client}/>
              <span className="work-label">{item.title || item.client}</span>
            </a>
          ))}
          <Link href="/portfolio" className="home-pill works-cta">SEE ALL WORKS</Link>
        </div>
      </section>

      <section className="home-section home-capabilities">
        <p className="home-statement">{content.capabilities.statement}</p>
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
        <img src="/demigod-logo.svg" alt="DEMIGOD" />
        <p>© {new Date().getFullYear()} DEMIGOD. All rights reserved.</p>
      </footer>
    </main>
  )
}
