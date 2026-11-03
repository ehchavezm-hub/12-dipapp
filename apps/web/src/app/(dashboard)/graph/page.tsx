import { auth } from "@/auth"
import DiplomaticGraph from "@/components/graph/DiplomaticGraph"
import GraphFilters from "@/components/graph/GraphFilters"
import NodeSheet from "@/components/graph/NodeSheet"
import { fetchGraphData } from "@/lib/services/graphService"
import { createBackendToken } from "@/lib/server/backendToken"
import type { DiplomaticEdge, DiplomaticNode } from "@dipapp/types"
import { redirect } from "next/navigation"

// Server Component — fetches graph data with session JWT for SSR
export default async function GraphPage() {
  const session = await auth()
  if (!session) redirect("/login")

  let initialNodes: DiplomaticNode[] = []
  let initialEdges: DiplomaticEdge[] = []
  let error: string | null = null

  try {
    const sub = (session.user as { githubLogin?: string }).githubLogin ?? session.user?.email ?? ""
    const token = createBackendToken(sub, session.user?.role ?? "viewer")
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
