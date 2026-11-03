import { auth } from "@/auth"
import DiplomaticGraph from "@/components/graph/DiplomaticGraph"
import GraphFilters from "@/components/graph/GraphFilters"
import NodeSheet from "@/components/graph/NodeSheet"
import { fetchGraphData } from "@/lib/services/graphService"
import type { DiplomaticEdge, DiplomaticNode } from "@dipapp/types"

// Server Component — fetches graph data with session token for SSR
export default async function GraphPage() {
  let initialNodes: DiplomaticNode[] = []
  let initialEdges: DiplomaticEdge[] = []
  let error: string | null = null

  try {
    const session = await auth()
    // The session token for backend auth — fall back gracefully when not signed in
    // In production, you'd pass session?.accessToken or a signed JWT here
    const token = process.env.DIPAPP_SERVICE_TOKEN ?? ""
    const data = await fetchGraphData(token || undefined)
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
