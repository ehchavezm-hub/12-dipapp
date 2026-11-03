"use client"

import { useMemo, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { Scenario } from "@/lib/types/results"

/* ── Semantic colours ───────────────────────────────────────────────── */
const C_ACTION  = "#FF6600"   // AECOM Orange — acción clave (roadmap step)
const C_PRO     = "#003087"   // Engineering Blue — favorable
const C_CON     = "#E85500"   // Orange Deep — fricción / riesgo
const C_LEV     = "#0078C1"   // Blue Medium — punto de apalancamiento
const C_ROOT    = "#1A1A1A"   // AECOM Black — escenario raíz

/* ── Layout constants ───────────────────────────────────────────────── */
const COL_W     = 280   // horizontal distance between columns
const NODE_H    = 70    // vertical step between nodes
const LEAF_X    = COL_W * 2 + 40

/* ── Node factory helpers ───────────────────────────────────────────── */
function makeNode(
  id: string,
  x: number,
  y: number,
  label: React.ReactNode,
  bg: string,
  width = 260,
): Node {
  return {
    id,
    position: { x, y },
    data: { label },
    style: {
      background: bg,
      border: "none",
      borderRadius: 8,
      width,
      padding: "8px 12px",
      color: "#fff",
      fontSize: 12,
      lineHeight: 1.4,
    },
  }
}

function leafLabel(tag: string, text: string) {
  return (
    <div>
      <span style={{ fontWeight: 700, opacity: 0.75, fontSize: 10, textTransform: "uppercase" }}>
        {tag}{" "}
      </span>
      {text}
    </div>
  )
}

interface DecisionMapProps {
  scenario: Scenario
}

export function DecisionMap({ scenario }: DecisionMapProps) {
  const [showCoT, setShowCoT] = useState(false)

  const { nodes, edges } = useMemo(() => {
    const builtNodes: Node[] = []
    const builtEdges: Edge[] = []

    /* Root node — scenario header */
    builtNodes.push(
      makeNode(
        "root",
        0,
        0,
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            Escenario {scenario.label} — {scenario.name}
          </div>
          <div style={{ opacity: 0.8, fontSize: 11, marginTop: 2 }}>
            Score {scenario.score_total.toFixed(1)} · Viabilidad {scenario.viability_score.toFixed(1)}
          </div>
        </div>,
        C_ROOT,
        280,
      )
    )

    /* ── Roadmap steps — center column, vertically centered ── */
    const stepCount  = scenario.roadmap.length
    const stepsTotal = stepCount * NODE_H
    const stepsStartY = -(stepsTotal / 2)

    scenario.roadmap.forEach((step, idx) => {
      const stepId = `step-${step.step}`
      const y = stepsStartY + idx * NODE_H
      builtNodes.push(
        makeNode(
          stepId,
          COL_W,
          y,
          <div>
            <div style={{ fontWeight: 700, fontSize: 12 }}>
              {step.step}. {step.action}
            </div>
            <div style={{ opacity: 0.8, fontSize: 10, marginTop: 2 }}>
              {step.timeline} · {step.responsible}
            </div>
          </div>,
          C_ACTION,
          260,
        )
      )
      if (idx === 0) {
        builtEdges.push({
          id: "edge-root-step1",
          source: "root",
          target: stepId,
          style: { stroke: C_ACTION, strokeWidth: 2 },
          animated: true,
        })
      } else {
        builtEdges.push({
          id: `edge-step-${step.step - 1}-${step.step}`,
          source: `step-${step.step - 1}`,
          target: stepId,
          style: { stroke: C_ACTION, strokeWidth: 2 },
          animated: true,
        })
      }
    })

    /* ── Leaf nodes — right column, vertically centered ── */
    const allLeaves: { id: string; tag: string; text: string; color: string }[] = [
      ...scenario.pros.map((p, i) => ({ id: `pro-${i}`, tag: "✓ Ventaja", text: p, color: C_PRO })),
      ...scenario.cons.map((c, i) => ({ id: `con-${i}`, tag: "✗ Riesgo", text: c, color: C_CON })),
      ...scenario.leverage_points.map((lp, i) => ({ id: `lev-${i}`, tag: "▸ Palanca", text: lp, color: C_LEV })),
    ]
    const leafTotal = allLeaves.length * NODE_H
    const leafStartY = -(leafTotal / 2)

    allLeaves.forEach(({ id, tag, text, color }, idx) => {
      const y = leafStartY + idx * NODE_H
      builtNodes.push(makeNode(id, LEAF_X, y, leafLabel(tag, text), color, 230))
      // Connect from last roadmap step (or root if no roadmap)
      const sourceId = stepCount > 0 ? `step-${stepCount}` : "root"
      builtEdges.push({
        id: `edge-${sourceId}-${id}`,
        source: sourceId,
        target: id,
        style: { stroke: color, strokeWidth: 1.2, opacity: 0.5 },
        animated: false,
      })
    })

    return { nodes: builtNodes, edges: builtEdges }
  }, [scenario])

  const totalRows = Math.max(
    scenario.roadmap.length,
    scenario.pros.length + scenario.cons.length + scenario.leverage_points.length,
  )
  const mapHeight = Math.max(380, totalRows * NODE_H + 120)

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
        {[
          { color: C_ACTION, label: "Acción clave (hoja de ruta)" },
          { color: C_PRO,    label: "Ventaja" },
          { color: C_CON,    label: "Riesgo / fricción" },
          { color: C_LEV,    label: "Punto de apalancamiento" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6D6E71" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
            {label}
          </div>
        ))}
      </div>

      {/* React Flow tree */}
      <div style={{ height: mapHeight, border: "1px solid #DADCE0", borderRadius: 8, overflow: "hidden" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          panOnDrag
          zoomOnScroll
        >
          <Background color="#F1F3F4" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => (n.style?.background as string) ?? "#6D6E71"}
            maskColor="rgba(241,243,244,0.7)"
            style={{ background: "#fff", border: "1px solid #DADCE0" }}
          />
        </ReactFlow>
      </div>

      {/* CoT toggle */}
      {scenario.chain_of_thought && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setShowCoT((v) => !v)}
            style={{
              background: "none", border: "1px solid #DADCE0", borderRadius: 6,
              padding: "6px 14px", fontSize: 12, color: "#6D6E71", cursor: "pointer",
              fontFamily: "var(--font-urbanist)", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <span style={{ color: "#0078C1", fontWeight: 700 }}>⚙</span>
            {showCoT ? "Ocultar" : "Ver"} cadena de razonamiento completa
          </button>
          {showCoT && (
            <div style={{
              marginTop: 8, background: "#FFF3E0", borderLeft: "3px solid #0078C1",
              padding: "12px 16px", borderRadius: 4, fontSize: 12, color: "#1A1A1A",
              lineHeight: 1.7, fontStyle: "italic", whiteSpace: "pre-wrap",
            }}>
              {scenario.chain_of_thought}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
