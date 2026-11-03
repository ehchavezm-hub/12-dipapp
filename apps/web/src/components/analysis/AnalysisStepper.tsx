"use client"

import { useAnalysisStore } from "@/lib/store/analysisStore"
import { submitAnalysis } from "@/lib/services/analysisService"
import { AnalysisCaseDTOSchema } from "@/lib/schemas/analysis"
import { TargetProfileStep } from "@/components/analysis/steps/TargetProfileStep"
import { GeopoliticalContextStep } from "@/components/analysis/steps/GeopoliticalContextStep"
import { ObjectiveStep } from "@/components/analysis/steps/ObjectiveStep"
import { WeightsStep } from "@/components/analysis/steps/WeightsStep"
import { DocumentsStep } from "@/components/analysis/steps/DocumentsStep"
import { useRouter } from "next/navigation"

const STEP_LABELS = [
  "Objetivo",
  "Contexto",
  "Misión",
  "Pesos",
  "Documentos",
]

const STEPS = [
  TargetProfileStep,
  GeopoliticalContextStep,
  ObjectiveStep,
  WeightsStep,
  DocumentsStep,
]

export function AnalysisStepper() {
  const { step, nextStep, prevStep, loadExampleCase, currentCase, setSubmitting, isSubmitting } =
    useAnalysisStore()
  const router = useRouter()

  const StepComponent = STEPS[step]

  async function handleSubmit() {
    const parsed = AnalysisCaseDTOSchema.safeParse(currentCase)
    if (!parsed.success) {
      alert("Por favor complete todos los campos requeridos.")
      return
    }
    setSubmitting(true)
    try {
      await submitAnalysis(parsed.data)
      router.push("/results/new")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        fontFamily: "var(--font-urbanist)",
      }}
    >
      {/* Progress indicator */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              flex: i < STEP_LABELS.length - 1 ? 1 : undefined,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: i <= step ? "#4285F4" : "#5F6368",
                color: i <= step ? "#fff" : "#5F6368",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <span
              style={{
                fontSize: 12,
                color: i === step ? "#4285F4" : "#5F6368",
                fontWeight: i === step ? 600 : 400,
              }}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: i < step ? "#4285F4" : "#5F6368",
                  marginLeft: 4,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Example case button on step 0 */}
      {step === 0 && (
        <button
          type="button"
          onClick={loadExampleCase}
          style={{
            background: "none",
            border: "1px solid #4285F4",
            color: "#4285F4",
            borderRadius: 4,
            padding: "6px 14px",
            cursor: "pointer",
            fontFamily: "var(--font-urbanist)",
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          Cargar Caso de Ejemplo
        </button>
      )}

      {/* Current step */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #5F6368",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <StepComponent />
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 0}
          style={{
            background: step === 0 ? "#5F6368" : "#fff",
            border: "1px solid #5F6368",
            color: step === 0 ? "#fff" : "#5F6368",
            borderRadius: 4,
            padding: "8px 20px",
            cursor: step === 0 ? "default" : "pointer",
            fontFamily: "var(--font-urbanist)",
          }}
        >
          Atrás
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            style={{
              background: "#4285F4",
              border: "none",
              color: "#fff",
              borderRadius: 4,
              padding: "8px 20px",
              cursor: "pointer",
              fontFamily: "var(--font-urbanist)",
            }}
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? "#5F6368" : "#34A853",
              border: "none",
              color: "#fff",
              borderRadius: 4,
              padding: "8px 20px",
              cursor: isSubmitting ? "default" : "pointer",
              fontFamily: "var(--font-urbanist)",
            }}
          >
            {isSubmitting ? "Analizando..." : "Analizar"}
          </button>
        )}
      </div>
    </div>
  )
}
