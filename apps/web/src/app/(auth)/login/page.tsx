"use client"

import { signIn } from "next-auth/react"

export default function LoginPage() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffffff",
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
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#000000", margin: "0 0 8px 0" }}>
            Iniciar sesión
          </h2>
          <p style={{ fontSize: 14, color: "#666666", margin: "0 0 32px 0" }}>
            Accede con tu cuenta de GitHub.
          </p>

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
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Iniciar sesión con GitHub
          </button>
        </div>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#999999" }}>
          Acceso restringido a miembros autorizados.
        </p>
      </div>
    </main>
  )
}
