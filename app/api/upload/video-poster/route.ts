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
  const id = String(form.get("id") || "")
  const poster = form.get("poster")

  if (!/^[0-9a-f-]{36}$/i.test(id) || !(poster instanceof File)) {
    return NextResponse.json(
      { error: "Invalid poster upload" },
      { status: 400 }
    )
  }

  const input = Buffer.from(await poster.arrayBuffer())

  const thumbnail = await sharp(input)
    .resize({
      width: 1200,
      height: 1200,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 84 })
    .toBuffer()

  const thumbnailUrl = await uploadObject(
    `thumbs/${id}.webp`,
    thumbnail,
    "image/webp"
  )

  return NextResponse.json({ thumbnail: thumbnailUrl })
}
