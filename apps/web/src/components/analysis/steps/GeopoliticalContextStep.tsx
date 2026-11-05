"use client"

import { useEffect, useRef } from "react"
import { useAnalysisStore } from "@/lib/store/analysisStore"
import type { Treaty } from "@/lib/schemas/analysis"

const INPUT_STYLE = {
  border: "1px solid #6D6E71",
  borderRadius: 4,
  padding: "8px 12px",
  width: "100%",
} as const

const TREATY_LEVELS: Array<{ level: Treaty["level"]; label: string; desc: string; examples: string }> = [
  {
    level: 1,
    label: "Nivel 1 — Alianza, Paz y Límites (×3.0)",
    desc: "Acuerdos de mayor jerarquía jurídica internacional. Definen la relación estructural entre estados.",
    examples: "Tratados de alianza militar, tratados de paz, acuerdos de delimitación de fronteras terrestres o marítimas, tratados de no agresión.",
  },
  {
    level: 2,
    label: "Nivel 2 — TLCs e Integración Regional (×2.0)",
    desc: "Acuerdos que regulan el comercio e integración económica entre países o bloques.",
    examples: "Tratados de Libre Comercio (TLC), acuerdos de integración regional (CAN, Mercosur, ASEAN), acuerdos de doble imposición fiscal, acuerdos de protección de inversiones (APPIs).",
  },
  {
    level: 3,
    label: "Nivel 3 — Cooperación Técnica y Cultural (×1.0)",
    desc: "Acuerdos de menor peso político pero que consolidan vínculos bilaterales sostenibles.",
    examples: "Acuerdos de cooperación científica y tecnológica, convenios culturales y educativos, acuerdos de intercambio académico, memorandos de entendimiento (MOU) sectoriales.",
  },
]

function clampCount(raw: string, max: number): number {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, max)
}

export function GeopoliticalContextStep() {
  const { currentCase, updateCase } = useAnalysisStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const context = currentCase.geopolitical_context ?? { region: "", description: "" }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [context.description])
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
      <h2 style={{ color: "#6D6E71", fontFamily: "var(--font-urbanist)" }}>
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
          ref={textareaRef}
          id="geo-description"
          value={context.description}
          onChange={(e) => {
            e.target.style.height = "auto"
            e.target.style.height = e.target.scrollHeight + "px"
            updateCase({
              geopolitical_context: { ...context, description: e.target.value },
            })
          }}
          rows={4}
          style={{ ...INPUT_STYLE, overflow: "hidden", resize: "none" }}
        />
      </div>

      <fieldset style={{ border: "1px solid #6D6E71", borderRadius: 4, padding: 16 }}>
        <legend style={{ color: "#6D6E71", padding: "0 4px", fontSize: 14 }}>
          Historial de acuerdos vigentes (Art. 38 Estatuto CIJ)
        </legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TREATY_LEVELS.map(({ level, label, desc, examples }) => (
            <div key={level} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <input
                id={`treaties-l${level}`}
                type="number"
                min={0}
                max={100}
                value={countFor(level)}
                onChange={(e) => setTreatyCount(level, clampCount(e.target.value, 100))}
                style={{ ...INPUT_STYLE, width: 80, flexShrink: 0 }}
              />
              <div>
                <label htmlFor={`treaties-l${level}`} style={{ fontSize: 13, fontWeight: 600, color: "#FF6600", display: "block", marginBottom: 2 }}>
                  {label} <span style={{ fontWeight: 400, color: "#9E9E9E", fontSize: 11 }}>
                    {level === 1 && "(0 – 100. Ej típico: 0–10. Perú ≈ 2, EE.UU. ≈ 8, país sin alianzas = 0)"}
                    {level === 2 && "(0 – 100. Ej típico: 5–30. Perú ≈ 15, EE.UU. ≈ 20, Bolivia ≈ 5)"}
                    {level === 3 && "(0 – 100. Ej típico: 10–80. Perú ≈ 40, China ≈ 85, país aislado ≈ 5)"}
                  </span>
                </label>
                <p style={{ margin: "0 0 2px", fontSize: 12, color: "#424242" }}>{desc}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#9E9E9E" }}>
                  <strong style={{ color: "#6D6E71" }}>Ej: </strong>{examples}
                </p>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <input
              id="icj-cases"
              type="number"
              min={0}
              max={50}
              value={icjCases}
              onChange={(e) => updateCase({ icj_cases: clampCount(e.target.value, 50) })}
              style={{ ...INPUT_STYLE, width: 80, flexShrink: 0 }}
            />
            <div>
              <label htmlFor="icj-cases" style={{ fontSize: 13, fontWeight: 600, color: "#E85500", display: "block", marginBottom: 2 }}>
                Litigios pendientes ante CIJ / CPA / CIADI (−15 pts c/u) <span style={{ fontWeight: 400, color: "#9E9E9E", fontSize: 11 }}>(0 – 50. Ej: Perú-Chile = 1, Bolivia-Chile = 2)</span>
              </label>
              <p style={{ margin: "0 0 2px", fontSize: 12, color: "#424242" }}>
                Cada litigio internacional activo penaliza el score final. Cuente solo los que están formalmente abiertos.
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#9E9E9E" }}>
                <strong style={{ color: "#6D6E71" }}>Ej: </strong>Demanda ante la Corte Internacional de Justicia (CIJ), arbitraje ante la Corte Permanente de Arbitraje (CPA), disputa en el CIADI por inversiones.
              </p>
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  )
}
