"use client"

import { useAnalysisStore } from "@/lib/store/analysisStore"

export function GeopoliticalContextStep() {
  const { currentCase, updateCase } = useAnalysisStore()
  const context = currentCase.geopolitical_context ?? { region: "", description: "" }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ color: "#5F6368", fontFamily: "var(--font-urbanist)" }}>
        Contexto Geopolítico
      </h2>
      <div>
        <label htmlFor="geo-region" style={{ display: "block", marginBottom: 4 }}>
          Región
        </label>
        <input
          id="geo-region"
          type="text"
          value={context.region}
          onChange={(e) =>
            updateCase({
              geopolitical_context: { ...context, region: e.target.value },
            })
          }
          style={{
            border: "1px solid #5F6368",
            borderRadius: 4,
            padding: "8px 12px",
            width: "100%",
          }}
        />
      </div>
      <div>
        <label htmlFor="geo-description" style={{ display: "block", marginBottom: 4 }}>
          Descripción
        </label>
        <textarea
          id="geo-description"
          value={context.description}
          onChange={(e) =>
            updateCase({
              geopolitical_context: { ...context, description: e.target.value },
            })
          }
          rows={4}
          style={{
            border: "1px solid #5F6368",
            borderRadius: 4,
            padding: "8px 12px",
            width: "100%",
          }}
        />
      </div>
    </div>
  )
}
