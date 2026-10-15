import "server-only"

import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "portfolio-cms-session"

function credentials() {
  return {
    login: process.env.ADMIN_LOGIN || "",
    password: process.env.ADMIN_PASSWORD || "",
    secret: process.env.SESSION_SECRET || "",
  }
}

function sessionValue() {
  const { login, password, secret } = credentials()
  return createHmac("sha256", secret).update(`${login}:${password}`).digest("hex")
}

export function validateCredentials(login: string, password: string) {
  const expected = credentials()
  return login === expected.login && password === expected.password
}

export async function createSession() {
  const store = await cookies()
  store.set(COOKIE_NAME, sessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isAuthenticated() {
  const store = await cookies()
  const value = store.get(COOKIE_NAME)?.value
  if (!value) return false

  const expected = sessionValue()
  const a = Buffer.from(value)
  const b = Buffer.from(expected)

  return a.length === b.length && timingSafeEqual(a, b)
}
