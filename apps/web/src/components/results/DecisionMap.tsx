"use client"

import { useMemo } from "react"
import { ReactFlow, Background, type Node, type Edge } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { Scenario } from "@/lib/types/results"

const STEP_COLORS = ["#34A853", "#FBBC05", "#4285F4"]

interface DecisionMapProps {
  scenario: Scenario
}

export function DecisionMap({ scenario }: DecisionMapProps) {
  const { nodes, edges } = useMemo(() => {
    const builtNodes: Node[] = scenario.roadmap.map((step, idx) => ({
      id: `step-${step.step}`,
      position: { x: 0, y: idx * 130 },
      data: {
        label: (
          <div style={{ textAlign: "left", padding: "4px 8px" }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: "#fff",
                marginBottom: 2,
              }}
            >
              {step.step}. {step.action}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)" }}>
              {step.timeline} · {step.responsible}
            </div>
          </div>
        ),
      },
      style: {
        background: STEP_COLORS[idx % 3],
        border: "none",
        borderRadius: 8,
        width: 320,
        padding: 4,
      },
    }))

    const builtEdges: Edge[] = scenario.roadmap.slice(0, -1).map((step) => ({
      id: `edge-${step.step}-${step.step + 1}`,
      source: `step-${step.step}`,
      target: `step-${step.step + 1}`,
      style: { stroke: "#5F6368" },
    }))

    return { nodes: builtNodes, edges: builtEdges }
  }, [scenario.roadmap])

  const mapHeight = Math.max(300, scenario.roadmap.length * 130 + 60)

  return (
    <div>
      <div
        style={{
          height: mapHeight,
          border: "1px solid #e8eaed",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e8eaed" />
        </ReactFlow>
      </div>

      {scenario.chain_of_thought && (
        <details
          style={{
            marginTop: 16,
            border: "1px solid #e8eaed",
            borderRadius: 8,
            padding: "8px 16px",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              fontWeight: 600,
              color: "#5F6368",
              fontSize: 13,
            }}
          >
            Cadena de razonamiento
          </summary>
          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#5F6368",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {scenario.chain_of_thought}
          </p>
        </details>
      )}
    </div>
  )
}
