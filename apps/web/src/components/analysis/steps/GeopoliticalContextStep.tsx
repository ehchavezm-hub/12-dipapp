"use client"

import { useAnalysisStore } from "@/lib/store/analysisStore"
import type { Treaty } from "@/lib/schemas/analysis"

const INPUT_STYLE = {
  border: "1px solid #5F6368",
  borderRadius: 4,
  padding: "8px 12px",
  width: "100%",
} as const

const TREATY_LEVELS: Array<{ level: Treaty["level"]; label: string }> = [
  { level: 1, label: "Nivel 1 — Alianza, Paz y Límites (×3.0)" },
  { level: 2, label: "Nivel 2 — TLCs e Integración Regional (×2.0)" },
  { level: 3, label: "Nivel 3 — Cooperación Técnica y Cultural (×1.0)" },
]

function clampCount(raw: string, max: number): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, max)
}

export function GeopoliticalContextStep() {
  const { currentCase, updateCase } = useAnalysisStore()
  const context = currentCase.geopolitical_context ?? { region: "", description: "" }
  const treaties = currentCase.treaties ?? []
  const icjCases = currentCase.icj_cases ?? 0

  const countFor = (level: Treaty["level"]) =>
    treaties.filter((t) => t.level === level && t.active).length

  function setTreatyCount(level: Treaty["level"], count: number) {
    const others = treaties.filter((t) => t.level !== level)
    const updated: Treaty[] = [
      ...others,
      ...Array.from({ length: count }, () => ({ level, active: true })),
    ]
    updateCase({ treaties: updated })
  }

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
          style={INPUT_STYLE}
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
          style={INPUT_STYLE}
        />
      </div>

      <fieldset style={{ border: "1px solid #5F6368", borderRadius: 4, padding: 16 }}>
        <legend style={{ color: "#5F6368", padding: "0 4px", fontSize: 14 }}>
          Historial de acuerdos vigentes (Art. 38 Estatuto CIJ)
        </legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TREATY_LEVELS.map(({ level, label }) => (
            <div key={level} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                id={`treaties-l${level}`}
                type="number"
                min={0}
                max={100}
                value={countFor(level)}
                onChange={(e) => setTreatyCount(level, clampCount(e.target.value, 100))}
                style={{ ...INPUT_STYLE, width: 80 }}
              />
              <label htmlFor={`treaties-l${level}`} style={{ fontSize: 13 }}>
                {label}
              </label>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              id="icj-cases"
              type="number"
              min={0}
              max={50}
              value={icjCases}
              onChange={(e) => updateCase({ icj_cases: clampCount(e.target.value, 50) })}
              style={{ ...INPUT_STYLE, width: 80 }}
            />
            <label htmlFor="icj-cases" style={{ fontSize: 13 }}>
              Litigios pendientes ante CIJ / CPA / CIADI (−15 pts c/u)
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  )
}
