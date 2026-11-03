import { auth } from "@/auth"
import DiplomaticGraph from "@/components/graph/DiplomaticGraph"
import GraphFilters from "@/components/graph/GraphFilters"
import NodeSheet from "@/components/graph/NodeSheet"
import { fetchGraphData } from "@/lib/services/graphService"
import type { DiplomaticEdge, DiplomaticNode } from "@dipapp/types"
import { createHmac } from "crypto"
import { redirect } from "next/navigation"

/** Create a backend-compatible HS256 JWT from the session's user claims. */
function createBackendToken(role: string, sub: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? ""
  const now = Math.floor(Date.now() / 1000)
  const payload = { sub, role, githubId: sub, iat: now, exp: now + 300 }
  const b64url = (data: string) =>
    Buffer.from(data).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = b64url(JSON.stringify(payload))
  const signingInput = `${header}.${body}`
  const sig = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
  return `${signingInput}.${sig}`
}

// Server Component — fetches graph data with session JWT for SSR
export default async function GraphPage() {
  const session = await auth()
  if (!session) redirect("/login")

  let initialNodes: DiplomaticNode[] = []
  let initialEdges: DiplomaticEdge[] = []
  let error: string | null = null

  try {
    const token = createBackendToken(
      session.user?.role ?? "viewer",
      session.user?.email ?? ""
    )
    const data = await fetchGraphData(token)
    initialNodes = data.nodes
    initialEdges = data.edges
  } catch (err) {
    // SSR fetch failed — the client will retry or show empty graph
    error = err instanceof Error ? err.message : "Failed to load graph data"
    console.error("[GraphPage] SSR fetch failed:", error)
  }

  return (
    <main className="flex flex-col gap-4 p-6 min-h-screen bg-gray-50 font-[var(--font-urbanist,sans-serif)]">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Diplomatic Relations Graph</h1>
        <p className="text-sm text-gray-500 mt-1">
          Explore connections between countries, organizations, embassies, and diplomats.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <GraphFilters />

      <div className="flex-1 relative" style={{ minHeight: 560 }}>
        <DiplomaticGraph
          initialNodes={initialNodes}
          initialEdges={initialEdges}
        />
        <NodeSheet />
      </div>
    </main>
  )
}
