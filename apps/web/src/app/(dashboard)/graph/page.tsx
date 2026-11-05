import { auth } from "@/auth"
import GraphCanvas from "@/components/graph/GraphCanvas"
import GraphFilters from "@/components/graph/GraphFilters"
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
    <main
      className="flex flex-col gap-2 p-4 overflow-hidden bg-white font-sans"
      style={{ height: "calc(100vh - 45px)" }}
    >
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

      {/* flex chain: flex:1 + display:flex so GraphCanvas height:100% resolves */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <GraphCanvas initialNodes={initialNodes} initialEdges={initialEdges} />
      </div>
    </main>
  )
}
