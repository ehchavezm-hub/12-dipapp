"use client"

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
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Afinidad geopolítica
        </span>
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

  const meta = COUNTRY_META[selectedNode.label]
  const flag = meta ? flagEmoji(meta.iso2) : selectedNode.type === "country" ? "🌐" : ""

  // All edges for this node
  const nodeEdges = allEdges.filter(
    (e) => e.source === selectedNode.id || e.target === selectedNode.id
  )

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // Connections to other countries
  const countryConns = nodeEdges
    .filter((e) => {
      const peerId = e.source === selectedNode.id ? e.target : e.source
      const peer = nodeMap.get(peerId)
      return peer?.type === "country"
    })
    .map((e) => {
      const peerId = e.source === selectedNode.id ? e.target : e.source
      const peer = nodeMap.get(peerId)
      const peerMeta = peer ? COUNTRY_META[peer.label] : undefined
      return {
        peer: peer?.label ?? peerId,
        flag: peerMeta ? flagEmoji(peerMeta.iso2) : "🌐",
        type: e.type,
        weight: e.weight,
        direction: e.source === selectedNode.id ? "→" : "←",
      }
    })
    .sort((a, b) => b.weight - a.weight)

  // Connections to organizations
  const orgConns = nodeEdges
    .map((e) => {
      const peerId = e.source === selectedNode.id ? e.target : e.source
      return nodeMap.get(peerId)
    })
    .filter((n) => n?.type === "organization")

  // Breakdown by edge type
  const breakdown = Object.entries(EDGE_TYPE_LABELS).map(([key, label]) => ({
    key,
    label,
    color: EDGE_TYPE_COLORS[key],
    count: nodeEdges.filter((e) => e.type === key).length,
  })).filter((b) => b.count > 0)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={clearSelection}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000 }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1001,
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        width: "min(600px, 94vw)",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-urbanist)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "18px 24px 14px",
          borderBottom: "1px solid #E0E0E0",
          background: "#FAFAFA",
        }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>{flag}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1A1A1A" }}>
              {selectedNode.label}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6D6E71" }}>
              <span style={{
                display: "inline-block",
                width: 10, height: 10, borderRadius: "50%",
                background: TYPE_COLORS[selectedNode.type] ?? "#6D6E71",
                marginRight: 5, verticalAlign: "middle",
              }} />
              {TYPE_LABELS[selectedNode.type] ?? selectedNode.type}
              {meta?.region ? ` · ${meta.region}` : ""}
            </p>
          </div>
          <button
            onClick={clearSelection}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9E9E9E", padding: 4, lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Affinity */}
          <AffinityBar score={selectedNode.affinityScore} />

          {/* Basic info cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {meta?.capital && (
              <div style={{ background: "#F8F9FA", borderRadius: 6, padding: "10px 14px" }}>
                <p style={{ margin: "0 0 3px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Capital</p>
                <p style={{ margin: 0, fontSize: 14, color: "#1A1A1A", fontWeight: 600 }}>{meta.capital}</p>
              </div>
            )}
            {meta?.population && (
              <div style={{ background: "#F8F9FA", borderRadius: 6, padding: "10px 14px" }}>
                <p style={{ margin: "0 0 3px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Población aprox.</p>
                <p style={{ margin: 0, fontSize: 14, color: "#1A1A1A", fontWeight: 600 }}>{meta.population}</p>
              </div>
            )}
            <div style={{ background: "#F8F9FA", borderRadius: 6, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Conexiones</p>
              <p style={{ margin: 0, fontSize: 14, color: "#1A1A1A", fontWeight: 600 }}>{nodeEdges.length}</p>
            </div>
            <div style={{ background: "#F8F9FA", borderRadius: 6, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 3px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cluster</p>
              <p style={{ margin: 0, fontSize: 13, color: "#1A1A1A", fontFamily: "monospace" }}>{selectedNode.clusterId}</p>
            </div>
          </div>

          {/* Breakdown by type */}
          {breakdown.length > 0 && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Tipo de relaciones
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {breakdown.map((b) => (
                  <span key={b.key} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: 20,
                    background: `${b.color}15`,
                    border: `1px solid ${b.color}40`,
                    fontSize: 12, color: b.color, fontWeight: 600,
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{b.count}</span>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Organizations */}
          {orgConns.length > 0 && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Organizaciones internacionales
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {orgConns.map((org) => org && (
                  <span key={org.id} style={{
                    padding: "4px 12px", borderRadius: 20,
                    background: "#003087", color: "#fff",
                    fontSize: 12, fontWeight: 600,
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
              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                Relaciones bilaterales ({countryConns.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {countryConns.map((c, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 12px",
                    background: "#F8F9FA", borderRadius: 6,
                    borderLeft: `3px solid ${EDGE_TYPE_COLORS[c.type] ?? "#E0E0E0"}`,
                  }}>
                    <span style={{ fontSize: 18 }}>{c.flag}</span>
                    <span style={{ flex: 1, fontSize: 13, color: "#1A1A1A", fontWeight: 600 }}>{c.peer}</span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 10,
                      background: `${EDGE_TYPE_COLORS[c.type] ?? "#6D6E71"}15`,
                      color: EDGE_TYPE_COLORS[c.type] ?? "#6D6E71",
                      fontWeight: 600,
                    }}>
                      {EDGE_TYPE_LABELS[c.type] ?? c.type}
                    </span>
                    <span style={{ fontSize: 11, color: "#9E9E9E", minWidth: 32, textAlign: "right" }}>
                      {c.direction} {(c.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nodeEdges.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: "#9E9E9E", fontStyle: "italic" }}>
              Este nodo no tiene conexiones registradas en el grafo.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
