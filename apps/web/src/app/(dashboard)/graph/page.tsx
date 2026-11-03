import { auth } from "@/auth"
import DiplomaticGraph from "@/components/graph/DiplomaticGraph"
import GraphFilters from "@/components/graph/GraphFilters"
import NodeSheet from "@/components/graph/NodeSheet"
import { fetchGraphData } from "@/lib/services/graphService"
import { createSessionBackendToken } from "@/lib/server/backendToken"
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
    const data = await fetchGraphData(createSessionBackendToken(session))
    initialNodes = data.nodes
    initialEdges = data.edges
  } catch (err) {
    console.error("[GraphPage] SSR fetch failed:", err)
    error = "No se pudieron cargar los datos del grafo. Intente recargar la página."
  }

  return (
    <main className="flex flex-col gap-4 p-6 min-h-screen bg-white font-sans">
      <header>
        <h1 className="text-2xl font-bold text-black">Grafo de Relaciones Diplomáticas</h1>
        <p className="text-sm text-brand-gray mt-1">
          Explore conexiones entre países, organizaciones, embajadas y diplomáticos.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-brand-red/10 border border-brand-red text-brand-red px-4 py-3 text-sm"
        >
          {error}
        </div>
      )}

      <GraphFilters />

      <div className="flex-1 relative" style={{ minHeight: 560 }}>
        <DiplomaticGraph initialNodes={initialNodes} initialEdges={initialEdges} />
        <NodeSheet />
      </div>
    </main>
  )
}
