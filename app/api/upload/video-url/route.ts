import { randomUUID } from "crypto"
import { NextResponse } from "next/server"

import { isAuthenticated } from "@/lib/auth"
import { createPresignedUpload } from "@/lib/r2"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const contentType = String(body?.contentType || "")

  if (contentType !== "video/mp4") {
    return NextResponse.json(
      { error: "Only MP4 video is supported" },
      { status: 400 }
    )
  }

  const id = randomUUID()
  const key = `videos/${id}.mp4`
  const signed = await createPresignedUpload(key, contentType)

  return NextResponse.json({
    id,
    ...signed,
  })
}
