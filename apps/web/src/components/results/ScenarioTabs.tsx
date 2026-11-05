"use client"

import dynamic from "next/dynamic"
import { useResultsStore } from "@/lib/store/resultsStore"
import { useAnalysisStore } from "@/lib/store/analysisStore"
import { ScenarioCard } from "./ScenarioCard"
import { DecisionMap } from "./DecisionMap"

const ScenarioExport = dynamic(
  () => import("./ScenarioExport").then((m) => m.ScenarioExport),
  { ssr: false, loading: () => <span style={{ fontSize: 13, color: "#6D6E71" }}>Preparando PDF…</span> }
)

const TAB_LABELS: Record<"A" | "B" | "C", string> = {
  A: "A — Óptima",
  B: "B — Moderada",
  C: "C — Contingencia",
}

function SkeletonPlaceholder() {
  return (
    <div style={{ padding: 24 }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 20,
            background: "#6D6E71",
            borderRadius: 4,
            marginBottom: 16,
            width: `${90 - i * 10}%`,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

export function ScenarioTabs() {
  const { scenarios, activeTab, isStreaming, scoring, setActiveTab } = useResultsStore()
  const { currentCase } = useAnalysisStore()

  const activeScenario = scenarios.find((s) => s.label === activeTab) ?? null

  return (
    <div>
      {/* Export full report button */}
      {scenarios.length === 3 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <ScenarioExport scenarios={scenarios} scoring={scoring} analysisCase={currentCase} />
        </div>
      )}

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid #6D6E71",
          marginBottom: 24,
          gap: 4,
        }}
      >
        {(["A", "B", "C"] as const).map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: "8px 8px 0 0",
                cursor: "pointer",
                fontFamily: "var(--font-urbanist)",
                fontSize: 14,
                fontWeight: isActive ? 700 : 400,
                background: isActive ? "#FF6600" : "#fff",
                color: isActive ? "#fff" : "#6D6E71",
                borderBottom: isActive ? "2px solid #FF6600" : "2px solid transparent",
                transition: "all 0.2s ease",
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeScenario ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <ScenarioCard scenario={activeScenario} />
          <div>
            <h3
              style={{
                color: "#6D6E71",
                fontSize: 16,
                marginBottom: 16,
                fontFamily: "var(--font-urbanist)",
              }}
            >
              Hoja de ruta
            </h3>
            <DecisionMap scenario={activeScenario} />
          </div>
        </div>
      ) : isStreaming ? (
        <SkeletonPlaceholder />
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            color: "#6D6E71",
            fontSize: 14,
          }}
        >
          No hay escenarios disponibles.
        </div>
      )}
    </div>
  )
}
