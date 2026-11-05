"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (result?.ok) {
      router.push("/graph")
    } else {
      setError("Email o contraseña incorrectos.")
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f5f5f5",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#000000", margin: 0 }}>
            DipApp
          </h1>
          <p style={{ fontSize: 14, color: "#666666", marginTop: 8 }}>
            Diplomatic Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e0e0e0",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#000000", margin: "0 0 24px 0" }}>
            Iniciar sesión
          </h2>

          {/* GitHub button */}
          <button
            onClick={() => signIn("github", { callbackUrl: "/graph" })}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              backgroundColor: "#24292F",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "14px 20px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
              marginBottom: 24,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Iniciar sesión con GitHub
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: "#e0e0e0" }} />
            <span style={{ fontSize: 13, color: "#999999", whiteSpace: "nowrap" }}>o con credenciales</span>
            <div style={{ flex: 1, height: 1, backgroundColor: "#e0e0e0" }} />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentials}>
            {error && (
              <div style={{
                backgroundColor: "#fff0f0",
                border: "1px solid #ffcccc",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 14,
                color: "#cc0000",
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#333333", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #d0d0d0",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 15,
                  color: "#000000",
                  backgroundColor: "#ffffff",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#333333", marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #d0d0d0",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 15,
                  color: "#000000",
                  backgroundColor: "#ffffff",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: loading ? "#aaaaaa" : "#1A1A1A",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "14px 20px",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                outline: "none",
              }}
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#999999" }}>
          Acceso restringido a miembros autorizados.
        </p>
      </div>
    </main>
  )
}
