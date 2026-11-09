"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { SiteContent } from "@/lib/site-content"

export default function SiteEditor() {
  const [content, setContent] = useState<SiteContent | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<"hero"|"sections"|"projects"|"footer">("hero")

  useEffect(() => {
    fetch("/api/site-content", { cache: "no-store" })
      .then(async r => { if (!r.ok) throw new Error("Cannot load content"); return r.json() })
      .then(setContent)
      .catch(e => setError(e.message))
  }, [])

  function patch(next: Partial<SiteContent>) {
    setContent(current => current ? { ...current, ...next } : null)
    setSaved(false)
  }

  async function save() {
    if (!content) return
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const r = await fetch("/api/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      })
      const result = await r.json()
      if (!r.ok) throw new Error(result.error || "Save failed")
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const field = (name: string, value: string, onChange: (next: string) => void, multiline = false) =>
    <label key={name} className="site-field">
      <span>{name}</span>
      {multiline
        ? <textarea rows={4} value={value} onChange={e => onChange(e.target.value)} />
        : <input value={value} onChange={e => onChange(e.target.value)} />}
    </label>

  return <main className="site-cms">
    <style>{`
      .site-cms { background:#000; color:#f0ecf9; min-height:100vh; padding:32px; font:14px Inter,Arial,sans-serif; }
      .site-cms a { color:#a790d9; text-decoration:none; }
      .site-cms h1 { font-size:32px; margin:12px 0 8px; }
      .site-cms h2 { font-size:20px; margin:0 0 22px; }
      .site-cms header { display:flex; justify-content:space-between; gap:24px; align-items:center; margin-bottom:32px; }
      .site-cms .site-actions { display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
      .site-cms .site-tabs { display:flex; flex-wrap:wrap; gap:8px; border-bottom:1px solid #302145; margin-bottom:28px; }
      .site-cms .site-tabs button { background:transparent; color:#c1c1c1; border:0; border-bottom:2px solid transparent; padding:12px 18px; cursor:pointer; }
      .site-cms .site-tabs button[aria-selected=true] { border-bottom-color:#a790d9; color:#fff; }
      .site-cms .site-panel { max-width:1000px; display:grid; gap:18px; }
      .site-cms .site-card { border:1px solid #36204c; border-radius:12px; background:#0e0c13; padding:24px; display:grid; gap:16px; }
      .site-cms .site-field { display:grid; gap:8px; min-width:0; color:#bcaed6; }
      .site-cms .site-field input, .site-cms .site-field textarea { width:100%; min-width:0; border:1px solid #382153; border-radius:8px; background:#08070b; color:white; padding:12px 14px; font:inherit; }
      .site-cms .site-field textarea { resize:vertical; line-height:1.5; }
      .site-cms .site-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
      .site-cms .site-btn { background:#683fbe; color:#fff; border:1px solid #8d62e0; padding:12px 24px; border-radius:40px; cursor:pointer; }
      .site-cms .site-muted { color:#a3a0aa; line-height:1.5; margin:0; }
      .site-cms .site-check { display:flex; gap:12px; align-items:center; }
      .site-cms .site-divider { height:1px; background:#312143; margin:10px 0; }
      @media(max-width:700px) { .site-cms { padding:18px; } .site-cms header { display:block; } .site-cms .site-grid { grid-template-columns:1fr; } .site-cms .site-actions { margin-top:16px; } }
    `}</style>
    <header>
      <div>
        <Link href="/cms">← Gallery CMS</Link>
        <h1>Homepage editor</h1>
        <p className="site-muted">Treść strony DEMIGOD · design i layout pozostają w kodzie</p>
      </div>
      <div className="site-actions">
        <a href="/preview/home" target="_blank" rel="noopener noreferrer">Open preview ↗</a>
        <button className="site-btn" onClick={save} disabled={!content || saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </header>
    {error && <p role="alert" style={{color:"#ff8787"}}>{error}</p>}
    {!content ? <p>Loading homepage content…</p> : <>
      <div className="site-tabs" role="tablist">
        {([["hero","Hero"],["sections","About & services"],["projects","Projects & portfolio"],["footer","Contact & SEO"]] as const).map(([id,label]) =>
          <button role="tab" aria-selected={tab === id} key={id} onClick={()=>setTab(id)}>{label}</button>
        )}
      </div>

      {tab === "hero" && <div className="site-panel">
        <section className="site-card">
          <h2>Hero</h2>
          <div className="site-grid">
            {field("Eyebrow",content.hero.eyebrow,v=>patch({hero:{...content.hero,eyebrow:v}}))}
            {field("CTA",content.hero.cta,v=>patch({hero:{...content.hero,cta:v}}))}
            {field("Headline top",content.hero.headlineTop,v=>patch({hero:{...content.hero,headlineTop:v}}))}
            {field("Headline bottom",content.hero.headlineBottom,v=>patch({hero:{...content.hero,headlineBottom:v}}))}
          </div>
          <div className="site-grid">
            {field("Left note",content.hero.leftNote,v=>patch({hero:{...content.hero,leftNote:v}}),true)}
            {field("Right note",content.hero.rightNote,v=>patch({hero:{...content.hero,rightNote:v}}),true)}
          </div>
        </section>
        <section className="site-card">
          <h2>Hero animation</h2>
          <p className="site-muted">Klatki WebP w Cloudflare R2. Włączenie animacji logo będzie aktywne po jej wdrożeniu.</p>
          {field("Sequence base URL",content.hero.sequenceBase,v=>patch({hero:{...content.hero,sequenceBase:v}}))}
          <div className="site-grid">
            {(["firstFrame","autoplayEnd","lastFrame"] as const).map(k => field(k,String(content.hero[k]),v=>patch({hero:{...content.hero,[k]:Number(v)}})))}
          </div>
          <label className="site-check"><input type="checkbox" checked={content.hero.introEnabled} onChange={e=>patch({hero:{...content.hero,introEnabled:e.target.checked}})}/> Enable vector logo intro (future feature)</label>
        </section>
      </div>}

      {tab === "sections" && <div className="site-panel">
        <section className="site-card">
          <h2>About me</h2>
          {field("Statement",content.about.statement,v=>patch({about:{...content.about,statement:v}}),true)}
          {field("CTA label",content.about.cta,v=>patch({about:{...content.about,cta:v}}))}
        </section>
        {content.services.map((s,i) => <section className="site-card" key={s.id}>
          <h2>Service {i+1}</h2>
          {field("Title",s.title,v=>patch({services:content.services.map((x,j)=>i===j?{...x,title:v}:x)}))}
          {field("Description",s.description,v=>patch({services:content.services.map((x,j)=>i===j?{...x,description:v}:x)}),true)}
          {field("Image URL",s.image,v=>patch({services:content.services.map((x,j)=>i===j?{...x,image:v}:x)}))}
        </section>)}
        <section className="site-card">
          <h2>Capabilities</h2>
          {field("Statement",content.capabilities.statement,v=>patch({capabilities:{...content.capabilities,statement:v}}),true)}
          {field("CV URL",content.capabilities.cvUrl,v=>patch({capabilities:{...content.capabilities,cvUrl:v}}))}
          {content.capabilities.columns.map((col,i)=><div className="site-grid" key={i}>
            {field("Column name",col.title,v=>patch({capabilities:{...content.capabilities,columns:content.capabilities.columns.map((c,j)=>j===i?{...c,title:v}:c)}}))}
            {field("Items — one per line",col.items.join("\n"),v=>patch({capabilities:{...content.capabilities,columns:content.capabilities.columns.map((c,j)=>j===i?{...c,items:v.split("\n")}:c)}}),true)}
          </div>)}
        </section>
      </div>}

      {tab === "projects" && <div className="site-panel">
        <section className="site-card">
          <h2>Case Studies</h2>
          <p className="site-muted">Te trzy karty są niezależne od galerii. Grafiki powinny wskazywać pliki publiczne w R2.</p>
          {content.caseStudies.map((s,i)=><div key={s.id} style={{display:"grid",gap:12}}>
            <div className="site-divider" />
            <div className="site-grid">
              {(["title","category","image","href"] as const).map(k => field(k,s[k],v=>patch({caseStudies:content.caseStudies.map((x,j)=>i===j?{...x,[k]:v}:x)})))}
            </div>
          </div>)}
        </section>
        <section className="site-card">
          <h2>Best Works</h2>
          <p className="site-muted">Wpisz ID prac z istniejącego CMS galerii, po jednym w linii. Puste pole wybierze prace z widgetu albo pierwsze opublikowane.</p>
          {field("Gallery item IDs",content.featuredWorkIds.join("\n"),v=>patch({featuredWorkIds:v.split("\n").map(x=>x.trim()).filter(Boolean)}),true)}
          <Link href="/cms">Go to Gallery CMS →</Link>
        </section>
      </div>}

      {tab === "footer" && <div className="site-panel">
        <section className="site-card"><h2>Contact</h2>
          {field("Eyebrow",content.contact.eyebrow,v=>patch({contact:{...content.contact,eyebrow:v}}))}
          {field("Email",content.contact.email,v=>patch({contact:{...content.contact,email:v}}))}
        </section>
        <section className="site-card"><h2>SEO</h2>
          {field("Page title",content.seo.title,v=>patch({seo:{...content.seo,title:v}}))}
          {field("Meta description",content.seo.description,v=>patch({seo:{...content.seo,description:v}}),true)}
        </section>
      </div>}
    </>}
  </main>
}
