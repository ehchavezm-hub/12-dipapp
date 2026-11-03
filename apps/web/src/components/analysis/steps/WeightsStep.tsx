"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ScoringWeightsSchema } from "@/lib/schemas/analysis"
import { useAnalysisStore } from "@/lib/store/analysisStore"
import type { ScoringWeights } from "@/lib/schemas/analysis"

const defaultValues: ScoringWeights = {
  w_affinity: 0,
  w_history: 0,
  w_interests: 0,
}

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ color: "#5F6368", fontFamily: "var(--font-urbanist)" }}>
        Pesos de Puntuación
      </h2>

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
            border: "1px solid #5F6368",
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
            border: "1px solid #5F6368",
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
            border: "1px solid #5F6368",
            borderRadius: 4,
            padding: "8px 12px",
            width: "120px",
          }}
        />
      </div>

      <p style={{ color: "#5F6368", fontFamily: "var(--font-urbanist)" }}>
        Suma actual: {sum.toFixed(2)}
      </p>

      {!sumsToOne && sum > 0 && (
        <p
          role="alert"
          style={{ color: "#EA4335", fontFamily: "var(--font-urbanist)" }}
        >
          Los pesos deben sumar 1.0
        </p>
      )}

      {errors.w_affinity && (
        <p
          role="alert"
          style={{ color: "#EA4335", fontFamily: "var(--font-urbanist)" }}
        >
          {errors.w_affinity.message}
        </p>
      )}
    </div>
  )
}
