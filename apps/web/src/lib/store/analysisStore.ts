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

// Peru TLC example case (ids match the seeded graph: c-per = Peru)
export const EXAMPLE_CASE: AnalysisCaseDTO = {
  target_profiles: [{ id: "c-per", name: "Peru", country_code: "PE" }],
  geopolitical_context: {
    region: "americas",
    description: "Pacific Alliance integration",
  },
  diplomatic_objective: {
    type: "trade",
    description:
      "Negotiate comprehensive TLC with Pacific Alliance partners",
  },
  scoring_weights: { ...DEFAULT_SCORING_WEIGHTS },
  analysis_period_years: 10,
  support_documents: [],
  treaties: [
    { level: 2, active: true },
    { level: 3, active: true },
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
