import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth"
import {
  deleteObjectByUrl,
  GalleryPayload,
  loadGallery,
  saveGallery,
} from "@/lib/r2"

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    return NextResponse.json(await loadGallery())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cannot load gallery" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as GalleryPayload
  const items = Array.isArray(body?.items) ? body.items : []

  await saveGallery({
    items: items.map((item, index) => ({
      ...item,
      mediaType:
        item.mediaType === "video" || /\.mp4(?:$|[?#])/i.test(item.full || "")
          ? "video"
          : "image",
      order: index + 1,
    })),
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const payload = await loadGallery()
  const item = payload.items.find((entry) => entry.id === id)

  if (item) {
    await Promise.allSettled([
      deleteObjectByUrl(item.thumbnail),
      deleteObjectByUrl(item.full),
    ])
  }

  const items = payload.items
    .filter((entry) => entry.id !== id)
    .map((entry, index) => ({ ...entry, order: index + 1 }))

  await saveGallery({ items })
  return NextResponse.json({ ok: true, items })
}
