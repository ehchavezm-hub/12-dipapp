"use client"

import { useRef, useState, useMemo } from "react"
import DiplomaticGraph, { type DiplomaticGraphHandle } from "@/components/graph/DiplomaticGraph"
import NodeSheet from "@/components/graph/NodeSheet"
import type { DiplomaticEdge, DiplomaticNode } from "@dipapp/types"

const NODE_LEGEND = [
  { color: "#00E5CC", label: "País — afinidad alta" },
  { color: "#FFB300", label: "País — afinidad media" },
  { color: "#FF5252", label: "País — afinidad baja" },
  { color: "#7B61FF", label: "Organización internacional" },
]

const EDGE_LEGEND = [
  { color: "#00E5CC", label: "Tratado bilateral" },
  { color: "#FFB300", label: "Acuerdo comercial" },
  { color: "#64B5F6", label: "Alineación ONU" },
  { color: "#FF5252", label: "Disputa" },
]

const btnStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #DADCE0",
  borderRadius: 4,
  padding: "6px 14px",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "var(--font-urbanist)",
  color: "#1A1A1A",
  lineHeight: 1,
  boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
}

type Tab = "connected" | "isolated"

interface GraphCanvasProps {
  initialNodes: DiplomaticNode[]
  initialEdges: DiplomaticEdge[]
}

export default function GraphCanvas({ initialNodes, initialEdges }: GraphCanvasProps) {
  const [activeTab, setActiveTab] = useState<Tab>("connected")
  const graphRef = useRef<DiplomaticGraphHandle>(null)

  // Split nodes into connected vs isolated
  const { connectedNodes, isolatedNodes } = useMemo(() => {
    const linked = new Set<string>()
    initialEdges.forEach((e) => { linked.add(e.source); linked.add(e.target) })
    return {
      connectedNodes: initialNodes.filter((n) => linked.has(n.id)),
      isolatedNodes:  initialNodes.filter((n) => !linked.has(n.id)),
    }
  }, [initialNodes, initialEdges])

  const tabBase: React.CSSProperties = {
    padding: "8px 20px",
    fontSize: 13,
    fontFamily: "var(--font-urbanist)",
    border: "1px solid #DADCE0",
    borderBottom: "none",
    borderRadius: "6px 6px 0 0",
    cursor: "pointer",
    background: "#F8F9FA",
    color: "#6D6E71",
  }

  const tabActive: React.CSSProperties = {
    ...tabBase,
    background: "#fff",
    color: "#FF6600",
    fontWeight: 600,
    borderColor: "#DADCE0",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Pestañas */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, borderBottom: "1px solid #DADCE0" }}>
        <button
          onClick={() => setActiveTab("connected")}
          style={activeTab === "connected" ? tabActive : tabBase}
        >
          🌐 Red diplomática
          <span style={{ marginLeft: 8, fontSize: 11, background: "#FF6600", color: "#fff", borderRadius: 10, padding: "1px 7px" }}>
            {connectedNodes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("isolated")}
          style={activeTab === "isolated" ? tabActive : tabBase}
        >
          🗺️ Países sin vinculación
          <span style={{ marginLeft: 8, fontSize: 11, background: "#6D6E71", color: "#fff", borderRadius: 10, padding: "1px 7px" }}>
            {isolatedNodes.length}
          </span>
        </button>

        {/* Controles zoom — alineados a la derecha */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, paddingBottom: 4 }}>
          <button onClick={() => graphRef.current?.fit()} style={btnStyle}>⊡ Ajustar</button>
          <button onClick={() => graphRef.current?.zoomIn()} style={btnStyle}>＋</button>
          <button onClick={() => graphRef.current?.zoomOut()} style={btnStyle}>－</button>
        </div>
      </div>

      {/* Canvas — solo monta el tab activo para evitar conflictos en el store */}
      <div style={{ border: "1px solid #DADCE0", borderTop: "none", borderRadius: "0 6px 6px 6px", overflow: "hidden", position: "relative", minHeight: 540 }}>
        {activeTab === "connected"
          ? <DiplomaticGraph key="connected" ref={graphRef} initialNodes={connectedNodes} initialEdges={initialEdges} />
          : <DiplomaticGraph key="isolated"  ref={graphRef} initialNodes={isolatedNodes}  initialEdges={[]} />
        }
      </div>

      {/* NodeSheet fuera de ambos tabs — reacciona al store compartido */}
      <NodeSheet allEdges={initialEdges} />

      {/* Leyenda — debajo del canvas */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px 20px",
        padding: "10px 16px",
        borderTop: "1px solid #E0E0E0",
        marginTop: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "center", fontFamily: "var(--font-urbanist)" }}>
          Nodos
        </span>
        {NODE_LEGEND.map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#424242", fontFamily: "var(--font-urbanist)" }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block", boxShadow: "0 0 0 1px rgba(0,0,0,0.12)" }} />
            {label}
          </span>
        ))}
        <span style={{ width: 1, background: "#E0E0E0", alignSelf: "stretch", display: "inline-block", margin: "0 4px" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "center", fontFamily: "var(--font-urbanist)" }}>
          Relaciones
        </span>
        {EDGE_LEGEND.map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#424242", fontFamily: "var(--font-urbanist)" }}>
            <span style={{ width: 22, height: 3, background: color, flexShrink: 0, display: "inline-block", borderRadius: 2 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
