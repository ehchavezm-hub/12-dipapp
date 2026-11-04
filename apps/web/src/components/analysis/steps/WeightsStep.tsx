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

  const LEGEND = [
    {
      key: "Afinidad",
      range: "0.0 – 1.0",
      desc: "Peso del score de afinidad geopolítica global (votos ONU, alianzas, ideología). Valor alto → la cercanía política pesa más en el resultado final.",
    },
    {
      key: "Historial",
      range: "0.0 – 1.0",
      desc: "Peso del historial de acuerdos bilaterales (tratados Nivel 1-3 menos litigios CIJ). Valor alto → los antecedentes diplomáticos y legales pesan más.",
    },
    {
      key: "Intereses",
      range: "0.0 – 1.0",
      desc: "Peso de los intereses mutuos (comercio, diáspora, energía, seguridad). Valor alto → la interdependencia económica y social pesa más.",
    },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ color: "#6D6E71", fontFamily: "var(--font-urbanist)" }}>
        Pesos de Puntuación
      </h2>

      {/* Legend */}
      <div style={{
        background: "#F8F9FA",
        border: "1px solid #E0E0E0",
        borderRadius: 6,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Guía de pesos — deben sumar 1.0
        </p>
        {LEGEND.map(({ key, range, desc }) => (
          <div key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{
              minWidth: 80, fontWeight: 700, fontSize: 13,
              color: "#FF6600", fontFamily: "var(--font-urbanist)",
            }}>
              {key}
              <div style={{ fontWeight: 400, fontSize: 11, color: "#9E9E9E" }}>{range}</div>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#424242", lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="w_affinity" style={{ display: "block", marginBottom: 4 }}>
          Afinidad
        </label>
        <input
          id="w_affinity"
          type="number"
          step="0.01"
          min={0}
          max={1}
          aria-label="Afinidad"
          {...register("w_affinity", { valueAsNumber: true })}
          onBlur={handleBlur}
          style={{
            border: "1px solid #6D6E71",
            borderRadius: 4,
            padding: "8px 12px",
            width: "120px",
          }}
        />
      </div>

      <div>
        <label htmlFor="w_history" style={{ display: "block", marginBottom: 4 }}>
          Historial
        </label>
        <input
          id="w_history"
          type="number"
          step="0.01"
          min={0}
          max={1}
          aria-label="Historial"
          {...register("w_history", { valueAsNumber: true })}
          onBlur={handleBlur}
          style={{
            border: "1px solid #6D6E71",
            borderRadius: 4,
            padding: "8px 12px",
            width: "120px",
          }}
        />
      </div>

      <div>
        <label htmlFor="w_interests" style={{ display: "block", marginBottom: 4 }}>
          Intereses
        </label>
        <input
          id="w_interests"
          type="number"
          step="0.01"
          min={0}
          max={1}
          aria-label="Intereses"
          {...register("w_interests", { valueAsNumber: true })}
          onBlur={handleBlur}
          style={{
            border: "1px solid #6D6E71",
            borderRadius: 4,
            padding: "8px 12px",
            width: "120px",
          }}
        />
      </div>

      <p style={{ color: "#6D6E71", fontFamily: "var(--font-urbanist)" }}>
        Suma actual: {sum.toFixed(2)}
      </p>

      {!sumsToOne && sum > 0 && (
        <p
          role="alert"
          style={{ color: "#E85500", fontFamily: "var(--font-urbanist)" }}
        >
          Los pesos deben sumar 1.0
        </p>
      )}

      {errors.w_affinity && (
        <p
          role="alert"
          style={{ color: "#E85500", fontFamily: "var(--font-urbanist)" }}
        >
          {errors.w_affinity.message}
        </p>
      )}
    </div>
  )
}
