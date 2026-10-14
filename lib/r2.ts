import "server-only"

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

export type GalleryItem = {
  id: string
  title: string
  client: string
  categories: string[]
  thumbnail: string
  full: string
  order: number
  published: boolean
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

function client() {
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

function bucket() {
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
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
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
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
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

  await client().send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: key,
    })
  )
}
