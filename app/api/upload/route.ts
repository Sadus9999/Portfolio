import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import sharp from "sharp"

import { isAuthenticated } from "@/lib/auth"
import { uploadObject } from "@/lib/r2"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await request.formData()
  const files = form.getAll("files").filter((value): value is File => value instanceof File)

  if (!files.length) {
    return NextResponse.json({ error: "No files" }, { status: 400 })
  }

  const results = []

  for (const file of files) {
    const input = Buffer.from(await file.arrayBuffer())
    const id = randomUUID()

    const full = await sharp(input)
      .rotate()
      .resize({
        width: 2500,
        height: 2500,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer()

    const thumb = await sharp(input)
      .rotate()
      .resize({
        width: 1000,
        height: 1000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer()

    const [fullUrl, thumbnailUrl] = await Promise.all([
      uploadObject(`full/${id}.webp`, full, "image/webp"),
      uploadObject(`thumbs/${id}.webp`, thumb, "image/webp"),
    ])

    results.push({
      id,
      originalName: file.name,
      full: fullUrl,
      thumbnail: thumbnailUrl,
    })
  }

  return NextResponse.json({ files: results })
}
