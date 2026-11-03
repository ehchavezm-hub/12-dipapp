"use client"

import { useEffect } from "react"
import { useAnalysisStore } from "@/lib/store/analysisStore"
import { useResultsStore } from "@/lib/store/resultsStore"
import { ScenarioTabs } from "@/components/results/ScenarioTabs"
import type { AnalysisCaseDTO } from "@/lib/schemas/analysis"

export default function ResultsPage() {
  const { currentCase } = useAnalysisStore()
  const { streamScenarios, scenarios, isStreaming } = useResultsStore()

  useEffect(() => {
    if (currentCase && Object.keys(currentCase).length > 0) {
      streamScenarios(currentCase as AnalysisCaseDTO)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "var(--font-urbanist)",
      }}
    >
      <h1 style={{ color: "#5F6368", marginBottom: 24 }}>
        Análisis Diplomático
      </h1>

      {/* Comparison bar */}
      {scenarios.length === 3 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          {scenarios.map((s) => (
            <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{ fontSize: 12, color: "#5F6368", marginBottom: 4 }}
              >
                Escenario {s.label}
              </div>
              <div
                style={{
                  height: 8,
                  background: "#e8eaed",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${s.score_total}%`,
                    background: "#4285F4",
                    borderRadius: 4,
                  }}
                />
              </div>
              <div
                style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}
              >
                {s.score_total.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isStreaming && scenarios.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            color: "#5F6368",
            fontSize: 14,
          }}
        >
          Generando análisis diplomático…
        </div>
      )}

      <ScenarioTabs />
    </main>
  )
}
