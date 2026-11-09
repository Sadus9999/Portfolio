import "server-only"

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { r2Bucket, r2Client } from "@/lib/r2"

export type SiteContent = {
  version: number
  hero: {
    eyebrow: string
    headlineTop: string
    headlineBottom: string
    leftNote: string
    rightNote: string
    cta: string
    sequenceBase: string
    firstFrame: number
    lastFrame: number
    autoplayEnd: number
    introEnabled: boolean
  }
  about: { statement: string; cta: string }
  services: Array<{ id: string; title: string; description: string; image: string }>
  caseStudies: Array<{ id: string; title: string; category: string; image: string; href: string }>
  featuredWorkIds: string[]
  capabilities: {
    statement: string
    columns: Array<{ title: string; items: string[] }>
    cvUrl: string
  }
  contact: { eyebrow: string; email: string }
  seo: { title: string; description: string }
}

export const defaultSiteContent: SiteContent = {
  version: 1,
  hero: {
    eyebrow: "I turn ideas into",
    headlineTop: "Working",
    headlineBottom: "products",
    leftNote: "I don't design\njust to make things\nlook good.\nI design to make\nthem work better.",
    rightNote: "Less friction.\nMore clarity.\nBetter experiences.",
    cta: "View case studies",
    sequenceBase: "https://pub-eff24699f34649e8bb817dacedb2d952.r2.dev/hero/frames/",
    firstFrame: 1000,
    lastFrame: 1239,
    autoplayEnd: 1059,
    introEnabled: false,
  },
  about: {
    statement: "Product designer with over 5 years of experience in UX/UI and over 15 years in digital design. Specializes in improving the usability, clarity, and conversion of web and mobile products, especially in projects with limited time and budget.",
    cta: "More about me",
  },
  services: [
    { id: "uiux", title: "UX/UI Design", description: "Designing clear, conversion-focused interfaces with a strong emphasis on UI and real product usability.", image: "" },
    { id: "graphic", title: "Graphic Design", description: "Designer by education and passion, with 15+ years of experience in visual communication and branding.", image: "" },
    { id: "motion", title: "Motion Design", description: "Creating explainer videos, product animations, and visual stories using motion and animation.", image: "" },
  ],
  caseStudies: [
    { id: "neonove", title: "NeoNove", category: "UX/UI Design", image: "", href: "/case-studies/neonove" },
    { id: "kr-motors", title: "KR Motors", category: "UX/UI Design", image: "", href: "/case-studies/kr-motors" },
    { id: "orla", title: "Orla Technologies", category: "UX/UI Design", image: "", href: "/case-studies/orla" },
  ],
  featuredWorkIds: [],
  capabilities: {
    statement: "Has experience in e-commerce, web applications, and design systems, delivering practical solutions based on proven UX principles and real business realities.",
    columns: [
      { title: "Brand", items: ["Logos and marks", "Visual identity", "Naming", "Brandbook"] },
      { title: "Product", items: ["Packaging", "Labels", "Illustration", "Print"] },
      { title: "Screen", items: ["UI / Web", "Motion design", "Broadcast"] },
      { title: "AI", items: ["Prototyping", "Workflow automation", "Generative visuals", "Custom tools"] },
    ],
    cvUrl: "",
  },
  contact: { eyebrow: "Let's talk", email: "michal.okon@demigod.com.pl" },
  seo: { title: "DEMIGOD — Product & Digital Designer", description: "UX/UI, digital design, motion and selected work." },
}

function assertText(value: unknown, name: string, max = 2000): string {
  if (typeof value !== "string" || value.length > max) throw new Error("Invalid " + name)
  return value
}

function assertUrl(value: unknown, name: string): string {
  const str = assertText(value, name, 2048)
  if (str && !(str.startsWith("/") || /^https:\/\//.test(str))) throw new Error("Invalid URL in " + name)
  return str
}

export function parseSiteContent(raw: unknown): SiteContent {
  if (!raw || typeof raw !== "object") throw new Error("Invalid content payload")
  const p = raw as SiteContent
  if (!p.hero || !p.about || !p.capabilities || !p.contact || !p.seo) throw new Error("Missing section")
  if (!Array.isArray(p.services) || !Array.isArray(p.caseStudies) || !Array.isArray(p.featuredWorkIds)) throw new Error("Invalid arrays")
  if (!Array.isArray(p.capabilities.columns)) throw new Error("Invalid capabilities")
  const hero = p.hero
  for (const key of ["eyebrow", "headlineTop", "headlineBottom", "leftNote", "rightNote", "cta"] as const) {
    assertText(hero[key], "hero." + key)
  }
  assertUrl(hero.sequenceBase, "hero.sequenceBase")
  for (const key of ["firstFrame", "lastFrame", "autoplayEnd"] as const) {
    if (!Number.isInteger(hero[key]) || hero[key] < 0 || hero[key] > 100000) throw new Error("Invalid frame number")
  }
  if (hero.firstFrame > hero.autoplayEnd || hero.autoplayEnd > hero.lastFrame || hero.lastFrame - hero.firstFrame > 1000) throw new Error("Invalid frame range")
  if (typeof hero.introEnabled !== "boolean") throw new Error("Invalid introEnabled")
  assertText(p.about.statement, "about.statement", 5000)
  assertText(p.about.cta, "about.cta")
  for (const item of p.services) {
    assertText(item.id, "service.id", 100)
    assertText(item.title, "service.title")
    assertText(item.description, "service.description")
    assertUrl(item.image, "service.image")
  }
  for (const item of p.caseStudies) {
    assertText(item.id, "caseStudy.id", 100)
    assertText(item.title, "caseStudy.title")
    assertText(item.category, "caseStudy.category")
    assertUrl(item.image, "caseStudy.image")
    assertUrl(item.href, "caseStudy.href")
  }
  for (const id of p.featuredWorkIds) assertText(id, "featuredWorkId", 100)
  assertText(p.capabilities.statement, "capabilities.statement", 5000)
  assertUrl(p.capabilities.cvUrl, "capabilities.cvUrl")
  for (const col of p.capabilities.columns) {
    assertText(col.title, "column.title")
    if (!Array.isArray(col.items)) throw new Error("Invalid column items")
    for (const item of col.items) assertText(item, "column item")
  }
  assertText(p.contact.eyebrow, "contact.eyebrow")
  assertText(p.contact.email, "contact.email", 320)
  assertText(p.seo.title, "seo.title", 160)
  assertText(p.seo.description, "seo.description", 320)
  return { ...p, version: 1 }
}

async function streamToString(body: any): Promise<string> {
  if (typeof body?.transformToString === "function") return body.transformToString()
  throw new Error("Unexpected R2 response")
}

export async function loadSiteContent(): Promise<SiteContent> {
  try {
    const result = await r2Client().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: "homepage.json" }))
    return parseSiteContent(JSON.parse(await streamToString(result.Body)))
  } catch (error: any) {
    if (error?.name === "NoSuchKey" || error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) return defaultSiteContent
    throw error
  }
}

export async function saveSiteContent(payload: SiteContent): Promise<void> {
  const content = parseSiteContent(payload)
  await r2Client().send(new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: "homepage.json",
    Body: JSON.stringify(content, null, 2),
    ContentType: "application/json; charset=utf-8",
    CacheControl: "no-store",
  }))
}
