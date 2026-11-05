"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import DiplomaticGraph, { type DiplomaticGraphHandle } from "@/components/graph/DiplomaticGraph"
import NodeSheet from "@/components/graph/NodeSheet"
import type { DiplomaticEdge, DiplomaticNode } from "@dipapp/types"

// ─── Fullscreen icons (inline SVG — always crisp) ─────────────────────────────
function ExpandIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  )
}
function CompressIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
      <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
    </svg>
  )
}

function CountrySearch({ nodes, onSelect }: { nodes: DiplomaticNode[]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return nodes.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 12)
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
          background: "#fff", border: "1px solid #DADCE0", borderRadius: 4,
          padding: "5px 10px", fontSize: 13, fontFamily: "var(--font-urbanist)",
          color: "#1A1A1A", width: 170, outline: "none",
          boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
        }}
      />
      {open && matches.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 999,
          background: "#fff", border: "1px solid #DADCE0", borderRadius: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: 180, maxHeight: 280, overflowY: "auto",
        }}>
          {matches.map((n) => (
            <button
              key={n.id}
              onMouseDown={() => { onSelect(n.id); setQuery(n.label); setOpen(false) }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "7px 12px",
                fontSize: 13, fontFamily: "var(--font-urbanist)", color: "#1A1A1A",
                background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid #F0F0F0",
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
  background: "#fff", border: "1px solid #DADCE0", borderRadius: 4,
  padding: "6px 14px", cursor: "pointer", fontSize: 13,
  fontFamily: "var(--font-urbanist)", color: "#1A1A1A", lineHeight: 1,
  boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
  display: "flex", alignItems: "center", gap: 5,
}

interface GraphCanvasProps {
  initialNodes: DiplomaticNode[]
  initialEdges: DiplomaticEdge[]
}

const EDGE_TYPE_META: { type: DiplomaticEdge["type"]; label: string; color: string; emoji: string }[] = [
  { type: "bilateral_treaty",  label: "Bilateral",  color: "#00E5CC", emoji: "🤝" },
  { type: "trade_agreement",   label: "Comercial",  color: "#4CAF50", emoji: "📦" },
  { type: "un_vote_alignment", label: "ONU",        color: "#64B5F6", emoji: "🗳" },
  { type: "dispute",           label: "Disputa",    color: "#FF5252", emoji: "⚠" },
]

export default function GraphCanvas({ initialNodes, initialEdges }: GraphCanvasProps) {
  const graphRef    = useRef<DiplomaticGraphHandle>(null)
  const wrapperRef  = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [activeEdgeTypes, setActiveEdgeTypes] = useState<Set<string>>(
    () => new Set(EDGE_TYPE_META.map((m) => m.type))
  )
  const [minWeight, setMinWeight] = useState(0)

  // Sync fullscreen state with browser events (ESC key exits via browser)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  function toggleEdgeType(type: string) {
    setActiveEdgeTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) { next.delete(type) } else { next.add(type) }
      return next
    })
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        flex: 1, minHeight: 0,
        display: "flex", flexDirection: "column",
        // Dark bg fills fullscreen chrome outside the canvas area
        background: isFullscreen ? "#0A1628" : "transparent",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        borderBottom: "1px solid #DADCE0", paddingBottom: 4,
        background: isFullscreen ? "#111E34" : "transparent",
        flexShrink: 0,
      }}>
        <span style={{ padding: "8px 20px", fontSize: 13, fontFamily: "var(--font-urbanist)", fontWeight: 600, color: isFullscreen ? "#FF9944" : "#FF6600" }}>
          🌐 Red diplomática
          <span style={{ marginLeft: 8, fontSize: 11, background: "#FF6600", color: "#fff", borderRadius: 10, padding: "1px 7px" }}>
            {initialNodes.length}
          </span>
        </span>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", paddingRight: 8 }}>
          <CountrySearch nodes={initialNodes} onSelect={(id) => graphRef.current?.focusNode(id)} />
          <button onClick={() => graphRef.current?.fit()}   style={btnStyle}>⊡ Ajustar</button>
          <button onClick={() => graphRef.current?.zoomIn()} style={btnStyle}>＋</button>
          <button onClick={() => graphRef.current?.zoomOut()} style={btnStyle}>－</button>
          {/* ── Fullscreen toggle — like YouTube ── */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            style={{ ...btnStyle, padding: "6px 10px" }}
          >
            {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
          </button>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "6px 14px",
        background: isFullscreen ? "#0E1A2E" : "#F7F8FA",
        borderBottom: "1px solid #DADCE0", flexWrap: "wrap", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: isFullscreen ? "#8899BB" : "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-urbanist)" }}>
          Relaciones
        </span>
        {EDGE_TYPE_META.map(({ type, label, color, emoji }) => {
          const on = activeEdgeTypes.has(type)
          return (
            <button
              key={type}
              onClick={() => toggleEdgeType(type)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20, cursor: "pointer",
                fontSize: 12, fontFamily: "var(--font-urbanist)",
                border: `1.5px solid ${color}`,
                background: on ? color + "22" : "transparent",
                color: on ? color : "#9E9E9E",
                fontWeight: on ? 600 : 400, transition: "all 0.15s",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? color : "#9E9E9E", flexShrink: 0, display: "inline-block" }} />
              {emoji} {label}
            </button>
          )
        })}
        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: isFullscreen ? "#8899BB" : "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-urbanist)" }}>
          Peso mín.
        </span>
        <input
          type="range" min={0} max={1} step={0.05}
          value={minWeight}
          onChange={(e) => setMinWeight(parseFloat(e.target.value))}
          style={{ width: 100, accentColor: "#FF6600", cursor: "pointer" }}
        />
        <span style={{ fontSize: 12, color: isFullscreen ? "#AABBCC" : "#424242", fontFamily: "var(--font-urbanist)", minWidth: 28 }}>
          {minWeight.toFixed(2)}
        </span>
      </div>

      {/* ── Canvas — flex:1 fills ALL remaining space (q7) ──────────── */}
      <div style={{
        flex: 1, minHeight: 0,
        border: "1px solid #DADCE0", borderTop: "none",
        borderRadius: isFullscreen ? 0 : "0 6px 6px 6px",
        overflow: "hidden", position: "relative",
      }}>
        <DiplomaticGraph
          ref={graphRef}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          activeEdgeTypes={activeEdgeTypes}
          minEdgeWeight={minWeight}
        />
      </div>

      {/* NodeSheet */}
      <NodeSheet allEdges={initialEdges} />

      {/* ── Legend — no wasted margin, compact ──────────────────────── */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "8px 16px",
        padding: "7px 16px",
        borderTop: "1px solid #E0E0E0",
        background: isFullscreen ? "#0E1A2E" : "transparent",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: isFullscreen ? "#8899BB" : "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "center", fontFamily: "var(--font-urbanist)" }}>
          Nodos
        </span>
        {NODE_LEGEND.map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: isFullscreen ? "#AABBCC" : "#424242", fontFamily: "var(--font-urbanist)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block", boxShadow: "0 0 0 1px rgba(0,0,0,0.12)" }} />
            {label}
          </span>
        ))}
        <span style={{ width: 1, background: "#E0E0E0", alignSelf: "stretch", display: "inline-block", margin: "0 2px" }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: isFullscreen ? "#8899BB" : "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", alignSelf: "center", fontFamily: "var(--font-urbanist)" }}>
          Relaciones
        </span>
        {EDGE_LEGEND.map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: isFullscreen ? "#AABBCC" : "#424242", fontFamily: "var(--font-urbanist)" }}>
            <span style={{ width: 18, height: 2.5, background: color, flexShrink: 0, display: "inline-block", borderRadius: 2 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
