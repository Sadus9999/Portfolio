"use client"

import { FormEvent, useState } from "react"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError("")

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    })

    if (!response.ok) {
      setError("Wrong password or login")
      setBusy(false)
      return
    }

    router.replace("/cms")
    router.refresh()
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <img
          className="brand-logo brand-logo-login"
          src="/demigod-logo.svg"
          alt="Demigod"
        />

        <div className="login-fields">
          <label className={"line-input" + (login ? " has-value" : "")}>
            <span>Login</span>
            <input
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              aria-label="Login"
            />
          </label>

          <label className={"line-input" + (password ? " has-value" : "")}>
            <span>Password</span>
            <div className="password-row">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Password"
              />
              <button
                className="icon-button password-toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
              >
                {showPassword ? (
                  <EyeIcon aria-hidden="true" />
                ) : (
                  <EyeSlashIcon aria-hidden="true" />
                )}
              </button>
            </div>
          </label>
        </div>

        <button className="button button-primary full" disabled={busy}>
          {busy ? "Logging in…" : "Login"}
        </button>

        <p className={"login-error" + (error ? " visible" : "")}>
          {error || "Wrong password or login"}
        </p>
      </form>
    </main>
  )
}
