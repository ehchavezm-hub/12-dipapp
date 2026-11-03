"use client"

import { useAnalysisStore } from "@/lib/store/analysisStore"

const OBJECTIVE_TYPES = [
  { value: "trade", label: "Comercio" },
  { value: "security", label: "Seguridad" },
  { value: "diplomacy", label: "Diplomacia" },
  { value: "humanitarian", label: "Humanitario" },
]

const PERIOD_OPTIONS: Array<5 | 10 | 20> = [5, 10, 20]

export function ObjectiveStep() {
  const { currentCase, updateCase } = useAnalysisStore()
  const objective = currentCase.diplomatic_objective ?? { type: "", description: "" }
  const period = currentCase.analysis_period_years ?? 10

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ color: "#5F6368", fontFamily: "var(--font-urbanist)" }}>
        Objetivo Diplomático
      </h2>
      <div>
        <label htmlFor="obj-type" style={{ display: "block", marginBottom: 4 }}>
          Tipo de Objetivo
        </label>
        <select
          id="obj-type"
          value={objective.type}
          onChange={(e) =>
            updateCase({
              diplomatic_objective: { ...objective, type: e.target.value },
            })
          }
          style={{
            border: "1px solid #5F6368",
            borderRadius: 4,
            padding: "8px 12px",
            width: "100%",
          }}
        >
          <option value="">Seleccionar...</option>
          {OBJECTIVE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="obj-description" style={{ display: "block", marginBottom: 4 }}>
          Descripción del Objetivo
        </label>
        <textarea
          id="obj-description"
          value={objective.description}
          onChange={(e) =>
            updateCase({
              diplomatic_objective: { ...objective, description: e.target.value },
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
      <div>
        <label htmlFor="obj-period" style={{ display: "block", marginBottom: 4 }}>
          Período de Análisis (años)
        </label>
        <select
          id="obj-period"
          value={period}
          onChange={(e) =>
            updateCase({
              analysis_period_years: Number(e.target.value) as 5 | 10 | 20,
            })
          }
          style={{
            border: "1px solid #5F6368",
            borderRadius: 4,
            padding: "8px 12px",
            width: "120px",
          }}
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p} años
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
