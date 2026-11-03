import { create } from "zustand"
import type { DiplomaticEdge, DiplomaticNode, GeopoliticRegion } from "@dipapp/types"

export interface GraphFilters {
  regions: GeopoliticRegion[]
  minAffinityScore: number
  types: DiplomaticNode["type"][]
}

export interface PathRequest {
  source: string
  target: string
}

interface GraphStore {
  nodes: DiplomaticNode[]
  edges: DiplomaticEdge[]
  selectedNode: DiplomaticNode | null
  highlightedPath: string[]
  pathRequest: PathRequest | null
  filters: GraphFilters
  setNodes: (nodes: DiplomaticNode[]) => void
  setEdges: (edges: DiplomaticEdge[]) => void
  selectNode: (node: DiplomaticNode | null) => void
  clearSelection: () => void
  setFilters: (filters: Partial<GraphFilters>) => void
  setHighlightedPath: (path: string[]) => void
  requestPath: (source: string, target: string) => void
  clearPath: () => void
}

const DEFAULT_FILTERS: GraphFilters = {
  regions: [],
  minAffinityScore: 0,
  types: [],
}

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  highlightedPath: [],
  pathRequest: null,
  filters: DEFAULT_FILTERS,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  selectNode: (node) => set({ selectedNode: node }),
  clearSelection: () => set({ selectedNode: null }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setHighlightedPath: (path) => set({ highlightedPath: path }),
  requestPath: (source, target) => set({ pathRequest: { source, target } }),
  clearPath: () => set({ pathRequest: null, highlightedPath: [] }),
}))
