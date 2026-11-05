"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { DEFAULT_SCORING_WEIGHTS, ScoringWeightsSchema } from "@/lib/schemas/analysis"
import { useAnalysisStore } from "@/lib/store/analysisStore"
import type { ScoringWeights } from "@/lib/schemas/analysis"

// Spec defaults: W_afinidad 0.40, W_historial 0.35, W_intereses 0.25
const defaultValues: ScoringWeights = { ...DEFAULT_SCORING_WEIGHTS }

export function WeightsStep() {
  const { currentCase, updateCase } = useAnalysisStore()
  const stored = currentCase.scoring_weights

  const {
    register,
    formState: { errors },
    getValues,
    control,
    reset,
  } = useForm<ScoringWeights>({
    resolver: zodResolver(ScoringWeightsSchema),
    defaultValues: stored ?? defaultValues,
    mode: "onChange",
  })

  // Sync external store updates (e.g. loadExampleCase) back into the form
  useEffect(() => {
    if (stored) {
      reset(stored)
    }
  }, [stored, reset])

  const watched = useWatch({ control })
  const sum =
    (Number(watched.w_affinity) || 0) +
    (Number(watched.w_history) || 0) +
    (Number(watched.w_interests) || 0)

  const sumsToOne = Math.abs(sum - 1.0) < 0.001

  function handleBlur() {
    const vals = getValues()
    updateCase({ scoring_weights: vals })
  }

  const WEIGHTS_META = [
    {
      id: "w_affinity" as const,
      label: "Afinidad",
      desc: "Score de afinidad geopolítica global: votos en la ONU, alianzas formales y posicionamiento ideológico entre ambos países.",
      high: "La cercanía política domina el resultado. Países aliados o ideológicamente afines obtienen scores más altos.",
      low:  "La política importa menos; el historial de tratados y los intereses concretos determinan más el score.",
    },
    {
      id: "w_history" as const,
      label: "Historial",
      desc: "Acumulado de acuerdos bilaterales vigentes (Nivel 1-3), descontando litigios ante CIJ, CPA o CIADI.",
      high: "Los antecedentes diplomáticos y legales pesan más. Se premian relaciones consolidadas con muchos tratados.",
      low:  "El pasado importa menos; la afinidad política actual o los intereses mutuos dominan la evaluación.",
    },
    {
      id: "w_interests" as const,
      label: "Intereses",
      desc: "Intereses mutuos concretos: volumen de comercio bilateral, diáspora, dependencia energética, cooperación en seguridad.",
      high: "La interdependencia económica y social pesa más. Países con vínculos prácticos sólidos obtienen scores más altos.",
      low:  "Los vínculos económicos cuentan menos; la afinidad política o el historial legal son más determinantes.",
    },
  ]

  const inputStyle = {
    border: "1px solid #6D6E71",
    borderRadius: 4,
    padding: "8px 12px",
    width: "90px",
    flexShrink: 0,
  } as const

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ color: "#6D6E71", fontFamily: "var(--font-urbanist)" }}>
        Pesos de Puntuación
      </h2>

      <p style={{ margin: 0, fontSize: 12, color: "#9E9E9E" }}>
        Los tres valores deben sumar <strong style={{ color: "#1A1A1A" }}>exactamente 1.0</strong>. Cada peso indica qué factor influye más en el score diplomático final.
      </p>

      {WEIGHTS_META.map(({ id, label, desc, high, low }) => {
        const fieldName = id as "w_affinity" | "w_history" | "w_interests"
        return (
          <div key={id} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <input
              id={id}
              type="number"
              step="0.01"
              min={0}
              max={1}
              aria-label={label}
              {...register(fieldName, { valueAsNumber: true })}
              onBlur={handleBlur}
              style={inputStyle}
            />
            <div>
              <label htmlFor={id} style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1A1A1A", marginBottom: 3 }}>
                {label} <span style={{ fontWeight: 400, color: "#9E9E9E", fontSize: 11 }}>(0.0 – 1.0)</span>
              </label>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "#424242", lineHeight: 1.5 }}>{desc}</p>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "#333333" }}>
                <strong>▲ Alto:</strong> {high}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#6D6E71" }}>
                <strong>▼ Bajo:</strong> {low}
              </p>
            </div>
          </div>
        )
      })}

      <p style={{ color: "#6D6E71", fontFamily: "var(--font-urbanist)" }}>
        Suma actual: {sum.toFixed(2)}
      </p>

      {!sumsToOne && sum > 0 && (
        <p
          role="alert"
          style={{ color: "#555555", fontFamily: "var(--font-urbanist)" }}
        >
          Los pesos deben sumar 1.0
        </p>
      )}

      {errors.w_affinity && (
        <p
          role="alert"
          style={{ color: "#555555", fontFamily: "var(--font-urbanist)" }}
        >
          {errors.w_affinity.message}
        </p>
      )}
    </div>
  )
}
