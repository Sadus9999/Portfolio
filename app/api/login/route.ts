import { NextResponse } from "next/server"
import { createSession, validateCredentials } from "@/lib/auth"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const login = typeof body.login === "string" ? body.login : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!validateCredentials(login, password)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  await createSession()
  return NextResponse.json({ ok: true })
}
