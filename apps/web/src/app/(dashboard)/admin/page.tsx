import { auth } from "@/auth"
import { redirect } from "next/navigation"

export const metadata = { title: "Admin — DipApp" }

async function getBackendStatus() {
  const backendUrl = process.env.BACKEND_URL ?? "https://dipapp-api.onrender.com"
  try {
    const r = await fetch(`${backendUrl}/health`, { next: { revalidate: 0 } })
    const data = r.ok ? (await r.json()) as Record<string, unknown> : null
    return { ok: r.ok, status: r.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "superadmin") {
    redirect("/graph")
  }

  const backend = await getBackendStatus()

  const rows: { label: string; value: string; ok?: boolean }[] = [
    { label: "Usuario", value: session.user.githubLogin ?? session.user.name ?? "—" },
    { label: "Rol", value: session.user.role },
    { label: "Email", value: session.user.email ?? "—" },
    { label: "Backend URL", value: process.env.BACKEND_URL ?? "https://dipapp-api.onrender.com" },
    { label: "Backend estado", value: backend.ok ? "✅ Online" : `❌ Error ${backend.status}`, ok: backend.ok },
    { label: "ANTHROPIC_API_KEY", value: process.env.ANTHROPIC_API_KEY ? "✅ Configurada" : "❌ No configurada", ok: !!process.env.ANTHROPIC_API_KEY },
    { label: "OPENAI_API_KEY (fallback)", value: process.env.OPENAI_API_KEY ? "✅ Configurada" : "⚠️ No configurada" },
    { label: "NEXTAUTH_SECRET", value: process.env.NEXTAUTH_SECRET ? "✅ Configurada" : "❌ No configurada", ok: !!process.env.NEXTAUTH_SECRET },
    { label: "GITHUB_ORG", value: process.env.GITHUB_ORG ?? "— (cualquier usuario GitHub)" },
    { label: "SUPERADMIN_GITHUB_LOGINS", value: process.env.SUPERADMIN_GITHUB_LOGINS ?? "—" },
  ]

  if (backend.data) {
    const d = backend.data
    if (typeof d.anthropic_configured === "boolean")
      rows.push({ label: "Anthropic (backend)", value: d.anthropic_configured ? "✅ OK" : "❌ Falta", ok: d.anthropic_configured as boolean })
    if (typeof d.openai_configured === "boolean")
      rows.push({ label: "OpenAI fallback (backend)", value: d.openai_configured ? "✅ OK" : "⚠️ No configurada" })
    if (typeof d.redis_configured === "boolean")
      rows.push({ label: "Redis rate-limit (backend)", value: d.redis_configured ? "✅ OK" : "⚠️ No configurado" })
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px", fontFamily: "var(--font-urbanist)" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: "#202124", marginBottom: 8 }}>
        Panel de Superadministrador
      </h1>
      <p style={{ color: "#5F6368", marginBottom: 32, fontSize: 14 }}>
        Configuración del sistema y estado de servicios. Solo visible para superadmins.
      </p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#5F6368", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
          Estado del Sistema
        </h2>
        <div style={{ border: "1px solid #DADCE0", borderRadius: 8, overflow: "hidden" }}>
          {rows.map(({ label, value, ok }, i) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 20px",
                background: i % 2 === 0 ? "#fff" : "#F8F9FA",
                borderBottom: i < rows.length - 1 ? "1px solid #DADCE0" : "none",
              }}
            >
              <span style={{ fontSize: 13, color: "#5F6368", fontWeight: 500 }}>{label}</span>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: ok === false ? "#EA4335" : ok === true ? "#34A853" : "#202124",
              }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#5F6368", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
          Variables de Entorno Requeridas
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { title: "Vercel (frontend)", vars: ["NEXTAUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "BACKEND_URL", "SUPERADMIN_GITHUB_LOGINS"] },
            { title: "Render (backend)", vars: ["NEXTAUTH_SECRET", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] },
          ].map(({ title, vars }) => (
            <div key={title} style={{ background: "#F8F9FA", border: "1px solid #DADCE0", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#4285F4", marginBottom: 10 }}>{title}</div>
              {vars.map(v => (
                <div key={v} style={{ fontSize: 12, color: "#202124", fontFamily: "monospace", padding: "3px 0", borderBottom: "1px solid #DADCE0" }}>
                  {v}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#5F6368", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
          RBAC — Roles
        </h2>
        <div style={{ border: "1px solid #DADCE0", borderRadius: 8, overflow: "hidden" }}>
          {[
            { rol: "superadmin", acceso: "Todo — incluyendo esta página, /analysis/new, /graph, /results", criterio: "SUPERADMIN_GITHUB_LOGINS o team dipapp-admins" },
            { rol: "editor", acceso: "/analysis/new, /graph, /results", criterio: "Team dipapp-editors en la org GitHub" },
            { rol: "viewer", acceso: "/graph, /results (solo lectura)", criterio: "Cualquier usuario GitHub autenticado" },
          ].map(({ rol, acceso, criterio }, i) => (
            <div key={rol} style={{ padding: "12px 20px", background: i % 2 === 0 ? "#fff" : "#F8F9FA", borderBottom: i < 2 ? "1px solid #DADCE0" : "none" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#4285F4", marginBottom: 4 }}>{rol}</div>
              <div style={{ fontSize: 12, color: "#202124", marginBottom: 2 }}>Acceso: {acceso}</div>
              <div style={{ fontSize: 11, color: "#5F6368" }}>Criterio: {criterio}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
