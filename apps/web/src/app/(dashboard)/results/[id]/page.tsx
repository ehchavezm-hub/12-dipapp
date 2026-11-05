"use client"

import Link from "next/link"
import { useEffect, useMemo } from "react"
import { useAnalysisStore } from "@/lib/store/analysisStore"
import { useResultsStore } from "@/lib/store/resultsStore"
import { ScenarioTabs } from "@/components/results/ScenarioTabs"
import { AnalysisCaseDTOSchema } from "@/lib/schemas/analysis"

export default function ResultsPage() {
  const currentCase = useAnalysisStore((s) => s.currentCase)
  const { streamScenarios, scenarios, isStreaming, error, scoring, metadata } = useResultsStore()

  // Results are stateless (no DB): they exist only for the case in memory.
  const parsedCase = useMemo(() => AnalysisCaseDTOSchema.safeParse(currentCase), [currentCase])

  useEffect(() => {
    if (parsedCase.success && scenarios.length === 0 && !error) {
      void streamScenarios(parsedCase.data)
    }
    // Run once per mount; streamScenarios guards against concurrent calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const retry = () => {
    if (parsedCase.success) void streamScenarios(parsedCase.data)
  }

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "var(--font-urbanist)",
      }}
    >
      <h1 style={{ color: "#6D6E71", marginBottom: 24 }}>Análisis Diplomático</h1>

      {!parsedCase.success && scenarios.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#6D6E71" }}>
          <p style={{ marginBottom: 16 }}>
            No hay un caso de análisis activo. Los resultados no se almacenan en el servidor.
          </p>
          <Link href="/analysis/new" style={{ color: "#1A1A1A", fontWeight: 600 }}>
            Crear un nuevo análisis
          </Link>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            border: "1px solid #555555",
            color: "#555555",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span>{error}</span>
          {parsedCase.success && (
            <button
              type="button"
              onClick={retry}
              disabled={isStreaming}
              style={{
                background: "#555555",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "var(--font-urbanist)",
              }}
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* Deterministic baseline score (pre-LLM) */}
      {scoring && (
        <section
          aria-label="Puntuación determinística"
          style={{
            border: "1px solid #6D6E71",
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            fontSize: 13,
            color: "#6D6E71",
          }}
        >
          <div>
            <div>Score base</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A" }}>
              {scoring.score_total.toFixed(1)}
            </div>
          </div>
          <div>Afinidad: {scoring.breakdown.affinity.toFixed(1)}</div>
          <div>Historial: {scoring.breakdown.history.toFixed(1)}</div>
          <div>Intereses: {scoring.breakdown.interests.toFixed(1)}</div>
          <div style={{ color: scoring.litigation_penalty < 0 ? "#555555" : "#6D6E71" }}>
            Litigios: {scoring.litigation_penalty.toFixed(0)}
          </div>
          {metadata && (
            <div>
              Modelo: {metadata.model_used} · {metadata.processing_time_s.toFixed(1)} s ·{" "}
              {metadata.rag_sources_count} fuentes
            </div>
          )}
        </section>
      )}

      {/* Comparison bar */}
      {scenarios.length === 3 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          {scenarios.map((s) => (
            <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#6D6E71", marginBottom: 4 }}>
                Escenario {s.label}
              </div>
              <div
                style={{
                  height: 8,
                  background: "#6D6E71",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.max(0, s.score_total))}%`,
                    background: "#1A1A1A",
                    borderRadius: 4,
                  }}
                />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                {s.score_total.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      )}

      {isStreaming && scenarios.length === 0 && (
        <div
          role="status"
          style={{ textAlign: "center", padding: 48, color: "#6D6E71", fontSize: 14 }}
        >
          Generando análisis diplomático… (puede tardar hasta 45 s)
        </div>
      )}

      {(parsedCase.success || scenarios.length > 0) && <ScenarioTabs />}
    </main>
  )
}
