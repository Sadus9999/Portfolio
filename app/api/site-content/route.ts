import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth"
import { loadSiteContent, parseSiteContent, saveSiteContent } from "@/lib/site-content"

export const runtime = "nodejs"

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    return NextResponse.json(await loadSiteContent(), { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Unable to load page content" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const payload = parseSiteContent(await request.json())
    await saveSiteContent(payload)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 })
  }
}
