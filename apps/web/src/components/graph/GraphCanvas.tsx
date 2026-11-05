"use client"

import { useRef, useState, useMemo } from "react"
import DiplomaticGraph, { type DiplomaticGraphHandle } from "@/components/graph/DiplomaticGraph"
import NodeSheet from "@/components/graph/NodeSheet"
import type { DiplomaticEdge, DiplomaticNode } from "@dipapp/types"

function CountrySearch({ nodes, onSelect }: { nodes: DiplomaticNode[]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return nodes
      .filter((n) => n.label.toLowerCase().includes(q))
      .slice(0, 12)
  }, [query, nodes])

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <input
        type="text"
        placeholder="🔍 Buscar país..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{
          background: "#fff",
          border: "1px solid #DADCE0",
          borderRadius: 4,
          padding: "5px 10px",
          fontSize: 13,
          fontFamily: "var(--font-urbanist)",
          color: "#1A1A1A",
          width: 170,
          outline: "none",
          boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
        }}
      />
      {open && matches.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          zIndex: 999,
          background: "#fff",
          border: "1px solid #DADCE0",
          borderRadius: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          minWidth: 180,
          maxHeight: 280,
          overflowY: "auto",
        }}>
          {matches.map((n) => (
            <button
              key={n.id}
              onMouseDown={() => { onSelect(n.id); setQuery(n.label); setOpen(false) }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 12px",
                fontSize: 13,
                fontFamily: "var(--font-urbanist)",
                color: "#1A1A1A",
                background: "none",
                border: "none",
                cursor: "pointer",
                borderBottom: "1px solid #F0F0F0",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF3EB")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              {n.type === "organization" ? "🏛 " : "🌐 "}{n.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const NODE_LEGEND = [
  { color: "#00E5CC", label: "País — afinidad alta" },
  { color: "#FFB300", label: "País — afinidad media" },
  { color: "#FF5252", label: "País — afinidad baja" },
  { color: "#7B61FF", label: "Organización internacional" },
]

const EDGE_LEGEND = [
  { color: "#00E5CC", label: "Tratado bilateral" },
  { color: "#4CAF50", label: "Acuerdo comercial" },
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

interface GraphCanvasProps {
  initialNodes: DiplomaticNode[]
  initialEdges: DiplomaticEdge[]
}

export default function GraphCanvas({ initialNodes, initialEdges }: GraphCanvasProps) {
  const graphRef = useRef<DiplomaticGraphHandle>(null)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Cabecera con título y controles */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, borderBottom: "1px solid #DADCE0", paddingBottom: 4 }}>
        <span style={{ padding: "8px 20px", fontSize: 13, fontFamily: "var(--font-urbanist)", fontWeight: 600, color: "#FF6600" }}>
          🌐 Red diplomática
          <span style={{ marginLeft: 8, fontSize: 11, background: "#FF6600", color: "#fff", borderRadius: 10, padding: "1px 7px" }}>
            {initialNodes.length}
          </span>
        </span>

        {/* Controles zoom — alineados a la derecha */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <CountrySearch
            nodes={initialNodes}
            onSelect={(id) => graphRef.current?.focusNode(id)}
          />
          <button onClick={() => graphRef.current?.fit()} style={btnStyle}>⊡ Ajustar</button>
          <button onClick={() => graphRef.current?.zoomIn()} style={btnStyle}>＋</button>
          <button onClick={() => graphRef.current?.zoomOut()} style={btnStyle}>－</button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ border: "1px solid #DADCE0", borderTop: "none", borderRadius: "0 6px 6px 6px", overflow: "hidden", position: "relative", minHeight: 540 }}>
        <DiplomaticGraph ref={graphRef} initialNodes={initialNodes} initialEdges={initialEdges} />
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
