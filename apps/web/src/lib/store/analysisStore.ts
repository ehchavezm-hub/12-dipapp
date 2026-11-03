import { create } from "zustand"
import { DEFAULT_SCORING_WEIGHTS, type AnalysisCaseDTO } from "@/lib/schemas/analysis"

export const STEP_COUNT = 5

interface AnalysisState {
  currentCase: Partial<AnalysisCaseDTO>
  step: number
  isSubmitting: boolean
  updateCase: (patch: Partial<AnalysisCaseDTO>) => void
  nextStep: () => void
  prevStep: () => void
  loadExampleCase: () => void
  reset: () => void
  setSubmitting: (value: boolean) => void
}

// Demo: Peru analyzing China for trade and infrastructure cooperation
export const EXAMPLE_CASE: AnalysisCaseDTO = {
  target_profiles: [{ id: "c-chn", name: "China", country_code: "CN" }],
  geopolitical_context: {
    region: "Asia-Pacífico",
    description:
      "China es el principal socio comercial de Perú, con creciente presencia en minería e infraestructura. La relación bilateral se enmarca en el TLC vigente desde 2010 y el interés chino en la Iniciativa de la Franja y la Ruta en América Latina.",
  },
  diplomatic_objective: {
    type: "trade",
    description:
      "Ampliar el TLC Perú-China para incluir servicios digitales y cooperación en infraestructura portuaria (Puerto de Chancay), fortaleciendo la posición peruana en la cadena de suministro Asia-Pacífico.",
  },
  scoring_weights: { ...DEFAULT_SCORING_WEIGHTS },
  analysis_period_years: 10,
  support_documents: [],
  output_language: "es" as const,
  treaties: [
    { level: 1, active: true },  // Alianza, paz y límites
    { level: 2, active: true },  // TLC vigente
    { level: 2, active: true },  // Acuerdo inversiones
    { level: 3, active: true },  // Cooperación técnica
    { level: 3, active: true },  // Cooperación cultural
    { level: 3, active: true },  // Acuerdo científico
  ],
  icj_cases: 0,
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentCase: {},
  step: 0,
  isSubmitting: false,
  updateCase: (patch) =>
    set((state) => ({ currentCase: { ...state.currentCase, ...patch } })),
  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, STEP_COUNT - 1) })),
  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 0) })),
  loadExampleCase: () => set({ currentCase: EXAMPLE_CASE }),
  reset: () => set({ currentCase: {}, step: 0, isSubmitting: false }),
  setSubmitting: (value) => set({ isSubmitting: value }),
}))
