import "server-only"

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export type GalleryItem = {
  id: string
  title: string
  client: string
  categories: string[]
  thumbnail: string
  full: string
  order: number
  published: boolean
  mediaType?: "image" | "video"
  aspectRatio?: number
  showInWidget?: boolean
  widgetSelectedAt?: number
}

export type GalleryPayload = {
  items: GalleryItem[]
}

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export const publicBaseUrl =
  process.env.R2_PUBLIC_URL ||
  "https://pub-eff24699f34649e8bb817dacedb2d952.r2.dev"

export function r2Client() {
  const accountId = env("R2_ACCOUNT_ID")

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  })
}

export function r2Bucket() {
  return process.env.R2_BUCKET || "demigod-portfolio"
}

export async function loadGallery(): Promise<GalleryPayload> {
  const response = await fetch(`${publicBaseUrl}/gallery.json?t=${Date.now()}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    if (response.status === 404) return { items: [] }
    throw new Error(`gallery.json returned ${response.status}`)
  }

  const data = await response.json()
  return { items: Array.isArray(data?.items) ? data.items : [] }
}

export async function saveGallery(payload: GalleryPayload) {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: "gallery.json",
      Body: JSON.stringify(payload, null, 2),
      ContentType: "application/json; charset=utf-8",
      CacheControl: "no-cache, no-store, must-revalidate",
    })
  )
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
) {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  )

  return `${publicBaseUrl}/${key}`
}

export async function deleteObjectByUrl(url: string) {
  if (!url.startsWith(publicBaseUrl + "/")) return
  const key = decodeURIComponent(url.slice(publicBaseUrl.length + 1))
  if (!key || key === "gallery.json") return

  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
    })
  )
}


export async function createPresignedUpload(
  key: string,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(
    r2Client(),
    command,
    { expiresIn: 900 }
  )

  return {
    uploadUrl,
    publicUrl: `${publicBaseUrl}/${key}`,
  }
}
