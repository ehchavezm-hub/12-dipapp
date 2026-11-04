"use client"

import { useGraphStore } from "@/lib/store/graphStore"
import type { DiplomaticEdge } from "@dipapp/types"

const TYPE_LABELS: Record<string, string> = {
  country:      "País",
  organization: "Organización internacional",
  embassy:      "Embajada",
  diplomat:     "Diplomático",
}

const REGION_LABELS: Record<string, string> = {
  americas:     "América",
  europe:       "Europa",
  asia_pacific: "Asia-Pacífico",
  africa:       "África",
  middle_east:  "Oriente Medio",
  oceania:      "Oceanía",
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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Afinidad geopolítica</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{score.toFixed(1)} — {label}</span>
      </div>
      <div style={{ height: 8, background: "#E0E0E0", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s" }} />
      </div>
    </div>
  )
}

interface NodeSheetProps {
  allEdges: DiplomaticEdge[]
}

export default function NodeSheet({ allEdges }: NodeSheetProps) {
  const { selectedNode, clearSelection, nodes } = useGraphStore()

  if (!selectedNode) return null

  // Edges where this node is source or target
  const nodeEdges = allEdges.filter(
    (e) => e.source === selectedNode.id || e.target === selectedNode.id
  )

  // Build connection list with peer node labels
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const connections = nodeEdges.map((e) => {
    const peerId = e.source === selectedNode.id ? e.target : e.source
    const peer = nodeMap.get(peerId)
    return { peer: peer?.label ?? peerId, type: e.type, weight: e.weight, direction: e.source === selectedNode.id ? "→" : "←" }
  }).sort((a, b) => b.weight - a.weight)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={clearSelection}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          width: "min(560px, 92vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-urbanist)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "18px 24px 14px",
          borderBottom: "1px solid #E0E0E0",
        }}>
          <span style={{
            width: 16, height: 16, borderRadius: "50%",
            background: TYPE_COLORS[selectedNode.type] ?? "#6D6E71",
            flexShrink: 0, display: "inline-block",
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>{selectedNode.label}</h2>
            <p style={{ margin: 0, fontSize: 12, color: "#6D6E71" }}>
              {TYPE_LABELS[selectedNode.type] ?? selectedNode.type}
              {selectedNode.region ? ` · ${REGION_LABELS[selectedNode.region] ?? selectedNode.region}` : ""}
            </p>
          </div>
          <button
            onClick={clearSelection}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#6D6E71", lineHeight: 1, padding: 4 }}
            aria-label="Cerrar"
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "18px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Affinity */}
          <AffinityBar score={selectedNode.affinityScore} />

          {/* Meta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "#F8F9FA", borderRadius: 6, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Región</p>
              <p style={{ margin: 0, fontSize: 14, color: "#1A1A1A", fontWeight: 600 }}>
                {REGION_LABELS[selectedNode.region] ?? selectedNode.region ?? "—"}
              </p>
            </div>
            <div style={{ background: "#F8F9FA", borderRadius: 6, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Conexiones</p>
              <p style={{ margin: 0, fontSize: 14, color: "#1A1A1A", fontWeight: 600 }}>{connections.length}</p>
            </div>
            <div style={{ background: "#F8F9FA", borderRadius: 6, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cluster</p>
              <p style={{ margin: 0, fontSize: 13, color: "#1A1A1A", fontFamily: "monospace" }}>{selectedNode.clusterId}</p>
            </div>
            <div style={{ background: "#F8F9FA", borderRadius: 6, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>ID</p>
              <p style={{ margin: 0, fontSize: 11, color: "#6D6E71", fontFamily: "monospace", wordBreak: "break-all" }}>{selectedNode.id}</p>
            </div>
          </div>

          {/* Connections list */}
          {connections.length > 0 && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Relaciones bilaterales
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {connections.map((c, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px",
                    background: "#F8F9FA", borderRadius: 6,
                    border: `1px solid ${EDGE_TYPE_COLORS[c.type] ?? "#E0E0E0"}22`,
                  }}>
                    <span style={{ fontSize: 11, color: EDGE_TYPE_COLORS[c.type] ?? "#6D6E71", fontWeight: 700, minWidth: 16 }}>{c.direction}</span>
                    <span style={{ flex: 1, fontSize: 13, color: "#1A1A1A", fontWeight: 600 }}>{c.peer}</span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 10,
                      background: `${EDGE_TYPE_COLORS[c.type] ?? "#6D6E71"}18`,
                      color: EDGE_TYPE_COLORS[c.type] ?? "#6D6E71",
                      fontWeight: 600,
                    }}>
                      {EDGE_TYPE_LABELS[c.type] ?? c.type}
                    </span>
                    <span style={{ fontSize: 11, color: "#9E9E9E", minWidth: 36, textAlign: "right" }}>
                      {(c.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {connections.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: "#9E9E9E", fontStyle: "italic" }}>
              Este nodo no tiene conexiones registradas en el grafo.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
