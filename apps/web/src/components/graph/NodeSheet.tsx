"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useGraphStore } from "@/lib/store/graphStore"
import { COUNTRY_META, flagEmoji } from "@/lib/data/countryMeta"
import type { DiplomaticEdge } from "@dipapp/types"

const TYPE_LABELS: Record<string, string> = {
  country:      "País",
  organization: "Organización internacional",
  embassy:      "Embajada",
  diplomat:     "Diplomático",
}

const TYPE_COLORS: Record<string, string> = {
  country:      "#FF6600",
  organization: "#003087",
  embassy:      "#0078C1",
  diplomat:     "#6D6E71",
}

const EDGE_TYPE_LABELS: Record<string, string> = {
  bilateral_treaty:  "Tratado bilateral",
  trade_agreement:   "Acuerdo comercial",
  un_vote_alignment: "Alineación ONU",
  dispute:           "Disputa",
}

const EDGE_TYPE_COLORS: Record<string, string> = {
  bilateral_treaty:  "#003087",
  trade_agreement:   "#FF6600",
  un_vote_alignment: "#0078C1",
  dispute:           "#E85500",
}

function AffinityBar({ score }: { score: number }) {
  const color = score >= 70 ? "#003087" : score >= 45 ? "#FF6600" : "#E85500"
  const label = score >= 70 ? "Alta" : score >= 45 ? "Media" : "Baja"
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Afinidad geopolítica
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{score.toFixed(1)} — {label}</span>
      </div>
      <div style={{ height: 6, background: "#E0E0E0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
    </div>
  )
}

interface NodeSheetProps {
  allEdges: DiplomaticEdge[]
}

export default function NodeSheet({ allEdges }: NodeSheetProps) {
  const { selectedNode, clearSelection, nodes } = useGraphStore()

  // Drag state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  // Reset position when a new node is selected
  useEffect(() => {
    if (selectedNode) setPos(null)
  }, [selectedNode?.id])

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't drag if clicking the close button
    if ((e.target as HTMLElement).closest("button")) return
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).closest("[data-sheet]")?.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect?.left ?? window.innerWidth / 2 - 225,
      origY: rect?.top  ?? window.innerHeight / 2 - 300,
    }

    function onMove(mv: MouseEvent) {
      if (!dragRef.current) return
      setPos({
        x: dragRef.current.origX + mv.clientX - dragRef.current.startX,
        y: dragRef.current.origY + mv.clientY - dragRef.current.startY,
      })
    }
    function onUp() {
      dragRef.current = null
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [])

  if (!selectedNode) return null

  const meta = COUNTRY_META[selectedNode.label]
  const flag = meta ? flagEmoji(meta.iso2) : selectedNode.type === "country" ? "🌐" : ""

  const nodeEdges = allEdges.filter(
    (e) => e.source === selectedNode.id || e.target === selectedNode.id
  )
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const countryConns = nodeEdges
    .filter((e) => {
      const peerId = e.source === selectedNode.id ? e.target : e.source
      return nodeMap.get(peerId)?.type === "country"
    })
    .map((e) => {
      const peerId = e.source === selectedNode.id ? e.target : e.source
      const peer = nodeMap.get(peerId)
      const peerMeta = peer ? COUNTRY_META[peer.label] : undefined
      return {
        peer: peer?.label ?? peerId,
        iso2: peerMeta?.iso2 ?? "",
        flag: peerMeta ? flagEmoji(peerMeta.iso2) : "🌐",
        type: e.type,
        weight: e.weight,
        direction: e.source === selectedNode.id ? "→" : "←",
      }
    })
    .sort((a, b) => b.weight - a.weight)

  const orgConns = nodeEdges
    .map((e) => {
      const peerId = e.source === selectedNode.id ? e.target : e.source
      return nodeMap.get(peerId)
    })
    .filter((n) => n?.type === "organization")

  const breakdown = Object.entries(EDGE_TYPE_LABELS).map(([key, label]) => ({
    key,
    label,
    color: EDGE_TYPE_COLORS[key],
    count: nodeEdges.filter((e) => e.type === key).length,
  })).filter((b) => b.count > 0)

  // Position: dragged → fixed top/left; default → centred via transform
  const positionStyle: React.CSSProperties = pos
    ? { top: pos.y, left: pos.x, transform: "none" }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }

  return (
    <>
      {/* Backdrop — only when NOT dragged so user can still pan the graph */}
      {!pos && (
        <div
          onClick={clearSelection}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.30)", zIndex: 1000 }}
        />
      )}

      {/* Modal — 75 % width */}
      <div
        data-sheet
        style={{
          position: "fixed",
          ...positionStyle,
          zIndex: 1001,
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 6px 32px rgba(0,0,0,0.20)",
          width: "min(450px, 70vw)",
          maxHeight: "75vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-urbanist)",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {/* Header — drag handle */}
        <div
          onMouseDown={onHeaderMouseDown}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px 10px",
            borderBottom: "1px solid #E0E0E0",
            background: "#FAFAFA",
            cursor: "grab",
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1 }}>{flag}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>
              {selectedNode.label}
            </h2>
            <p style={{ margin: "1px 0 0", fontSize: 10, color: "#6D6E71" }}>
              <span style={{
                display: "inline-block",
                width: 8, height: 8, borderRadius: "50%",
                background: TYPE_COLORS[selectedNode.type] ?? "#6D6E71",
                marginRight: 4, verticalAlign: "middle",
              }} />
              {TYPE_LABELS[selectedNode.type] ?? selectedNode.type}
              {meta?.region ? ` · ${meta.region}` : ""}
            </p>
          </div>
          <button
            onClick={clearSelection}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9E9E9E", padding: 2, lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

          <AffinityBar score={selectedNode.affinityScore} />

          {/* Basic info cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {meta?.capital && (
              <div style={{ background: "#F8F9FA", borderRadius: 5, padding: "7px 10px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 9, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Capital</p>
                <p style={{ margin: 0, fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}>{meta.capital}</p>
              </div>
            )}
            {meta?.population && (
              <div style={{ background: "#F8F9FA", borderRadius: 5, padding: "7px 10px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 9, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Población aprox.</p>
                <p style={{ margin: 0, fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}>{meta.population}</p>
              </div>
            )}
            <div style={{ background: "#F8F9FA", borderRadius: 5, padding: "7px 10px" }}>
              <p style={{ margin: "0 0 2px", fontSize: 9, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Conexiones</p>
              <p style={{ margin: 0, fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}>{nodeEdges.length}</p>
            </div>
            <div style={{ background: "#F8F9FA", borderRadius: 5, padding: "7px 10px" }}>
              <p style={{ margin: "0 0 2px", fontSize: 9, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cluster</p>
              <p style={{ margin: 0, fontSize: 10, color: "#1A1A1A", fontFamily: "monospace" }}>{selectedNode.clusterId}</p>
            </div>
          </div>

          {/* Breakdown by type */}
          {breakdown.length > 0 && (
            <div>
              <p style={{ margin: "0 0 7px", fontSize: 9, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Tipo de relaciones
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {breakdown.map((b) => (
                  <span key={b.key} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 9px", borderRadius: 20,
                    background: `${b.color}15`,
                    border: `1px solid ${b.color}40`,
                    fontSize: 10, color: b.color, fontWeight: 600,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{b.count}</span>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Organizations */}
          {orgConns.length > 0 && (
            <div>
              <p style={{ margin: "0 0 7px", fontSize: 9, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Organizaciones internacionales
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {orgConns.map((org) => org && (
                  <span key={org.id} style={{
                    padding: "3px 9px", borderRadius: 20,
                    background: "#003087", color: "#fff",
                    fontSize: 10, fontWeight: 600,
                  }}>
                    {org.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Country connections */}
          {countryConns.length > 0 && (
            <div>
              <p style={{ margin: "0 0 7px", fontSize: 9, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Relaciones bilaterales ({countryConns.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {countryConns.map((c, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "5px 9px",
                    background: "#F8F9FA", borderRadius: 5,
                    borderLeft: `3px solid ${EDGE_TYPE_COLORS[c.type] ?? "#E0E0E0"}`,
                  }}>
                    <span style={{ fontSize: 14 }}>{c.flag}</span>
                    <span style={{ flex: 1, fontSize: 11, color: "#1A1A1A", fontWeight: 600 }}>{c.peer}</span>
                    <span style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 10,
                      background: `${EDGE_TYPE_COLORS[c.type] ?? "#6D6E71"}15`,
                      color: EDGE_TYPE_COLORS[c.type] ?? "#6D6E71",
                      fontWeight: 600,
                    }}>
                      {EDGE_TYPE_LABELS[c.type] ?? c.type}
                    </span>
                    <span style={{ fontSize: 9, color: "#9E9E9E", minWidth: 28, textAlign: "right" }}>
                      {c.direction} {(c.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nodeEdges.length === 0 && (
            <p style={{ margin: 0, fontSize: 11, color: "#9E9E9E", fontStyle: "italic" }}>
              Este nodo no tiene conexiones registradas en el grafo.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
