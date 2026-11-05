"use client"

import { useState } from "react"
import { useAnalysisStore, PRESET_CASES } from "@/lib/store/analysisStore"
import { useResultsStore } from "@/lib/store/resultsStore"
import { AnalysisCaseDTOSchema, DEFAULT_SCORING_WEIGHTS, OUTPUT_LANGUAGE_OPTIONS, type OutputLanguage } from "@/lib/schemas/analysis"
import { TargetProfileStep } from "@/components/analysis/steps/TargetProfileStep"
import { GeopoliticalContextStep } from "@/components/analysis/steps/GeopoliticalContextStep"
import { ObjectiveStep } from "@/components/analysis/steps/ObjectiveStep"
import { WeightsStep } from "@/components/analysis/steps/WeightsStep"
import { DocumentsStep } from "@/components/analysis/steps/DocumentsStep"
import { useRouter } from "next/navigation"

const STEP_HELP: { title: string; content: { label: string; desc: string }[] }[] = [
  {
    title: "Paso 1 — Perfil del Objetivo",
    content: [
      { label: "Nombre", desc: "País o entidad a analizar. Ej: «China», «Brasil», «Unión Europea»." },
      { label: "Código de País", desc: "Código ISO de 2 letras. Ej: PE = Perú, BR = Brasil, CN = China, US = Estados Unidos." },
    ],
  },
  {
    title: "Paso 2 — Contexto Geopolítico",
    content: [
      { label: "Región", desc: "Zona geográfica del país. Ej: «América del Sur», «Asia-Pacífico», «Europa»." },
      { label: "Descripción", desc: "Situación geopolítica actual. Incluya relaciones regionales, conflictos activos y tendencias relevantes." },
      { label: "Nivel 1 — Alianza, Paz y Límites", desc: "Número de tratados de alianza, paz y límites territoriales vigentes entre Perú y el país objetivo. Ej: 2" },
      { label: "Nivel 2 — TLCs e Integración Regional", desc: "Número de Tratados de Libre Comercio y acuerdos de integración regional vigentes. Ej: 5" },
      { label: "Nivel 3 — Cooperación Técnica y Cultural", desc: "Número de acuerdos de cooperación técnica, científica o cultural vigentes. Ej: 8" },
      { label: "Litigios CIJ / CPA / CIADI", desc: "Número de litigios internacionales pendientes (cada uno penaliza -15 pts en el score). Ej: 1" },
    ],
  },
  {
    title: "Paso 3 — Misión Diplomática",
    content: [
      { label: "Objetivo diplomático", desc: "Meta principal que Perú busca lograr con este análisis. Ej: «Negociar acuerdo de cooperación en infraestructura» o «Resolver disputa comercial sobre aranceles»." },
    ],
  },
  {
    title: "Paso 4 — Pesos de Análisis",
    content: [
      { label: "¿Qué son los pesos?", desc: "Importancia relativa de cada factor en el score final. Deben sumar exactamente 1.0." },
      { label: "Histórico de tratados", desc: "Peso dado al historial de acuerdos bilaterales." },
      { label: "Votos ONU", desc: "Peso dado a la alineación de votos en la ONU." },
      { label: "Intercambio comercial", desc: "Peso dado al volumen de comercio bilateral." },
      { label: "Diásporas", desc: "Peso dado a comunidades de migrantes entre ambos países." },
      { label: "Proyectos ICJ", desc: "Peso dado a litigios y proyectos ante la Corte Internacional de Justicia." },
    ],
  },
  {
    title: "Paso 5 — Documentos de Apoyo",
    content: [
      { label: "¿Qué subir?", desc: "PDFs relevantes al caso: informes diplomáticos, contratos, reportes de inteligencia, notas de prensa oficial." },
      { label: "Límite", desc: "Máximo 5 archivos PDF. La IA los analiza para enriquecer los escenarios generados." },
      { label: "Opcional", desc: "El análisis puede ejecutarse sin documentos, pero la calidad mejora con contexto adicional." },
    ],
  },
]

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
  const {
    step,
    nextStep,
    prevStep,
    loadExampleCase,
    currentCase,
    updateCase,
    setSubmitting,
    isSubmitting,
  } = useAnalysisStore()
  const resetResults = useResultsStore((s) => s.reset)
  const router = useRouter()
  const [issues, setIssues] = useState<string[]>([])
  const [showPresets, setShowPresets] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const StepComponent = STEPS[step]
  const language = (currentCase.output_language ?? "es") as OutputLanguage
  const llmModel = currentCase.llm_model ?? "claude-haiku-3-5"

  /**
   * Validate and hand off to /results/new, which performs the single LLM request.
   * (Previously the stepper POSTed here AND the results page POSTed again,
   * doubling LLM cost/latency and discarding the first response.)
   */
  function handleSubmit() {
    // Apply the defaults the steps display but only persist once edited
    const parsed = AnalysisCaseDTOSchema.safeParse({
      analysis_period_years: 10,
      scoring_weights: { ...DEFAULT_SCORING_WEIGHTS },
      ...currentCase,
    })
    if (!parsed.success) {
      setIssues(
        parsed.error.issues.map((issue) => {
          const path = issue.path.join(".") || "caso"
          return `${path}: ${issue.message}`
        })
      )
      return
    }
    setIssues([])
    setSubmitting(true)
    updateCase(parsed.data)
    resetResults()
    router.push("/results/new")
    setSubmitting(false)
  }

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        fontFamily: "var(--font-urbanist)",
      }}
    >
      {/* Language + Model selectors */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6D6E71", fontFamily: "var(--font-urbanist)" }}>
          🌐 Idioma:
          <select
            value={language}
            onChange={(e) => updateCase({ output_language: e.target.value as OutputLanguage })}
            style={{
              border: "1px solid #DADCE0", borderRadius: 4, padding: "4px 8px",
              fontFamily: "var(--font-urbanist)", fontSize: 13, color: "#1A1A1A",
              background: "#fff", cursor: "pointer",
            }}
          >
            {OUTPUT_LANGUAGE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6D6E71", fontFamily: "var(--font-urbanist)" }}>
          🤖 Modelo IA:
          <select
            value={llmModel}
            onChange={(e) => updateCase({ llm_model: e.target.value as "claude-haiku-3-5" | "claude-sonnet-4-5" | "claude-opus-4-5" })}
            style={{
              border: "1px solid #DADCE0", borderRadius: 4, padding: "4px 8px",
              fontFamily: "var(--font-urbanist)", fontSize: 13, color: "#1A1A1A",
              background: "#fff", cursor: "pointer",
            }}
          >
            <option value="claude-haiku-3-5">Haiku — rápido y económico</option>
            <option value="claude-sonnet-4-5">Sonnet — equilibrado</option>
            <option value="claude-opus-4-5">Opus — máxima calidad</option>
          </select>
        </label>
      </div>

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
                background: i <= step ? "#1A1A1A" : "#CCCCCC",
                color: "#fff",
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
                color: i === step ? "#1A1A1A" : "#6D6E71",
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
                  background: i < step ? "#1A1A1A" : "#CCCCCC",
                  marginLeft: 4,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Help popup */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 8, padding: 28,
              maxWidth: 520, width: "90%", maxHeight: "80vh", overflowY: "auto",
              fontFamily: "var(--font-urbanist)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: "#1A1A1A" }}>{STEP_HELP[step].title}</h2>
              <button
                onClick={() => setShowHelp(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6D6E71" }}
              >✕</button>
            </div>
            {STEP_HELP[step].content.map((item) => (
              <div key={item.label} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, color: "#1A1A1A", fontSize: 14, marginBottom: 4 }}>{item.label}</div>
                <div style={{ color: "#1A1A1A", fontSize: 14, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
            <button
              onClick={() => setShowHelp(false)}
              style={{
                marginTop: 8, background: "#1A1A1A", border: "none", color: "#fff",
                borderRadius: 4, padding: "8px 20px", cursor: "pointer",
                fontFamily: "var(--font-urbanist)", fontSize: 14,
              }}
            >Entendido</button>
          </div>
        </div>
      )}

      {/* Example case picker on step 0 + help button */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-start" }}>
        {step === 0 && (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowPresets(v => !v)}
              style={{
                background: "none", border: "1px solid #1A1A1A", color: "#1A1A1A",
                borderRadius: 4, padding: "6px 14px", cursor: "pointer",
                fontFamily: "var(--font-urbanist)", fontSize: 14,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              Cargar Caso de Ejemplo
              <span style={{ fontSize: 10 }}>{showPresets ? "▲" : "▼"}</span>
            </button>
            {showPresets && (
              <div style={{
                position: "absolute", top: "100%", left: 0, zIndex: 50,
                background: "#fff", border: "1px solid #E0E0E0", borderRadius: 6,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 340, marginTop: 4,
              }}>
                {PRESET_CASES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { loadExampleCase(idx); setShowPresets(false) }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "10px 14px", background: "none", border: "none",
                      cursor: "pointer", borderBottom: idx < PRESET_CASES.length - 1 ? "1px solid #F2F2F2" : "none",
                      fontFamily: "var(--font-urbanist)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F5F5F5")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>{preset.label}</div>
                    <div style={{ fontSize: 11, color: "#6D6E71", marginTop: 2 }}>{preset.tag}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          title="Ayuda para este paso"
          style={{
            background: "#F1F3F4", border: "1px solid #DADCE0", color: "#6D6E71",
            borderRadius: "50%", width: 32, height: 32, cursor: "pointer",
            fontFamily: "var(--font-urbanist)", fontSize: 15, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >?</button>
      </div>

      {/* Current step */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #6D6E71",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <StepComponent />
      </div>

      {issues.length > 0 && (
        <div
          role="alert"
          style={{
            border: "1px solid #999999",
            color: "#333333",
            borderRadius: 4,
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <strong>Complete los campos requeridos:</strong>
          <ul style={{ margin: "8px 0 0 16px" }}>
            {issues.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 0}
          style={{
            background: step === 0 ? "#6D6E71" : "#fff",
            border: "1px solid #6D6E71",
            color: step === 0 ? "#fff" : "#6D6E71",
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
              background: "#1A1A1A",
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
              background: isSubmitting ? "#CCCCCC" : "#333333",
              border: "none",
              color: "#fff",
              borderRadius: 4,
              padding: "8px 20px",
              cursor: isSubmitting ? "default" : "pointer",
              fontFamily: "var(--font-urbanist)",
            }}
          >
            {isSubmitting ? "Enviando..." : "Analizar"}
          </button>
        )}
      </div>
    </div>
  )
}
