import { create } from "zustand"
import type { AnalysisCaseDTO } from "@/lib/schemas/analysis"

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

// Peru TLC example case
const EXAMPLE_CASE: AnalysisCaseDTO = {
  target_profiles: [{ id: "c-chl", name: "Peru", country_code: "PE" }],
  geopolitical_context: {
    region: "americas",
    description: "Pacific Alliance integration",
  },
  diplomatic_objective: {
    type: "trade",
    description:
      "Negotiate comprehensive TLC with Pacific Alliance partners",
  },
  scoring_weights: {
    w_affinity: 0.4,
    w_history: 0.35,
    w_interests: 0.25,
  },
  analysis_period_years: 10,
  support_documents: [],
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentCase: {},
  step: 0,
  isSubmitting: false,
  updateCase: (patch) =>
    set((state) => ({ currentCase: { ...state.currentCase, ...patch } })),
  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 4) })),
  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 0) })),
  loadExampleCase: () => set({ currentCase: EXAMPLE_CASE }),
  reset: () => set({ currentCase: {}, step: 0, isSubmitting: false }),
  setSubmitting: (value) => set({ isSubmitting: value }),
}))
