"use client"

import { useRef } from "react"
import DiplomaticGraph, { type DiplomaticGraphHandle } from "@/components/graph/DiplomaticGraph"
import NodeSheet from "@/components/graph/NodeSheet"
import type { DiplomaticEdge, DiplomaticNode } from "@dipapp/types"

const NODE_LEGEND = [
  { color: "#FF6600", label: "País" },
  { color: "#003087", label: "Organización internacional" },
  { color: "#0078C1", label: "Embajada" },
  { color: "#6D6E71", label: "Diplomático" },
]

const EDGE_LEGEND = [
  { color: "#003087", label: "Tratado bilateral" },
  { color: "#FF6600", label: "Acuerdo comercial" },
  { color: "#0078C1", label: "Alineación ONU" },
  { color: "#E85500", label: "Disputa" },
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

interface GraphCanvasProps {
  initialNodes: DiplomaticNode[]
  initialEdges: DiplomaticEdge[]
}

export default function GraphCanvas({ initialNodes, initialEdges }: GraphCanvasProps) {
  const graphRef = useRef<DiplomaticGraphHandle>(null)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Controles de zoom — encima del canvas */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => graphRef.current?.fit()} style={btnStyle} title="Mostrar todos los nodos">
          ⊡ Ajustar vista
        </button>
        <button onClick={() => graphRef.current?.zoomIn()} style={btnStyle} title="Acercar">
          ＋ Acercar
        </button>
        <button onClick={() => graphRef.current?.zoomOut()} style={btnStyle} title="Alejar">
          － Alejar
        </button>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", minHeight: 560 }}>
        <DiplomaticGraph ref={graphRef} initialNodes={initialNodes} initialEdges={initialEdges} />
        <NodeSheet />
      </div>

      {/* Leyenda — debajo y fuera del canvas */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px 24px",
        padding: "10px 16px",
        borderTop: "1px solid #E0E0E0",
        marginTop: 4,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "center", fontFamily: "var(--font-urbanist)" }}>
          Nodos
        </span>
        {NODE_LEGEND.map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#424242", fontFamily: "var(--font-urbanist)" }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block", border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.12)" }} />
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
