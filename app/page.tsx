"use client"

import { FormEvent, useState } from "react"
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

    router.push("/cms")
    router.refresh()
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand brand-login">DEMIGOD</div>

        <div className="login-fields">
          <label className="line-input">
            <span>Login</span>
            <input
              autoComplete="username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              aria-label="Login"
            />
          </label>

          <label className="line-input">
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
                className="icon-button"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
              >
                {showPassword ? "◉" : "⊘"}
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
