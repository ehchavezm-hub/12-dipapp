import type { DiplomaticEdge, DiplomaticNode } from "@dipapp/types"

export interface GraphData {
  nodes: DiplomaticNode[]
  edges: DiplomaticEdge[]
}

/**
 * Fetches /graph/data from the backend API.
 * Requires a valid JWT in the Authorization header.
 */
export async function fetchGraphData(token?: string): Promise<GraphData> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${backendUrl}/graph/data`, { headers })

  if (!res.ok) {
    throw new Error(`Failed to fetch graph data: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<GraphData>
}
