import type { DiplomaticEdge, DiplomaticNode } from "@dipapp/types"
import { getBackendUrl } from "@/lib/server/backendToken"

export interface GraphData {
  nodes: DiplomaticNode[]
  edges: DiplomaticEdge[]
}

/**
 * Fetches /graph/data from the backend API (server-side only).
 * Requires a valid backend JWT (see createBackendToken).
 */
export async function fetchGraphData(token: string): Promise<GraphData> {
  const res = await fetch(`${getBackendUrl()}/graph/data`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch graph data: ${res.status} ${res.statusText}`)
  }

  return (await res.json()) as GraphData
}
