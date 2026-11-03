import { create } from "zustand"
import type { Scenario, ThreeScenariosResult } from "@/lib/types/results"
import type { AnalysisCaseDTO } from "@/lib/schemas/analysis"

interface ResultsState {
  scenarios: Scenario[]
  activeTab: "A" | "B" | "C"
  isStreaming: boolean
  metadata: ThreeScenariosResult["analysis_metadata"] | null
  streamScenarios: (caseDTO: AnalysisCaseDTO) => Promise<void>
  setActiveTab: (tab: "A" | "B" | "C") => void
  reset: () => void
}

export const useResultsStore = create<ResultsState>((set) => ({
  scenarios: [],
  activeTab: "A",
  isStreaming: false,
  metadata: null,

  streamScenarios: async (caseDTO: AnalysisCaseDTO) => {
    set({ isStreaming: true, scenarios: [], metadata: null })
    try {
      const response = await fetch("/api/proxy/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseDTO),
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const text = await response.text()
      const lines = text.split("\n").filter((l) => l.trim() !== "")

      // Try NDJSON: each line is a Scenario
      const parsedScenarios: Scenario[] = []
      let parsedFull = false

      for (const line of lines) {
        try {
          const parsed: unknown = JSON.parse(line)
          // Check if it's a full ThreeScenariosResult
          if (
            parsed !== null &&
            typeof parsed === "object" &&
            "scenarios" in parsed &&
            Array.isArray((parsed as ThreeScenariosResult).scenarios) &&
            (parsed as ThreeScenariosResult).scenarios.length === 3
          ) {
            const full = parsed as ThreeScenariosResult
            set({
              scenarios: full.scenarios,
              metadata: full.analysis_metadata,
            })
            parsedFull = true
            break
          }
          // Otherwise treat as individual Scenario
          if (
            parsed !== null &&
            typeof parsed === "object" &&
            "label" in parsed
          ) {
            parsedScenarios.push(parsed as Scenario)
            set({ scenarios: [...parsedScenarios] })
          }
        } catch {
          // Skip unparseable lines
        }
      }

      // If nothing parsed via NDJSON, try the full text as a single JSON object
      if (!parsedFull && parsedScenarios.length === 0) {
        try {
          const full = JSON.parse(text) as ThreeScenariosResult
          if (full.scenarios && full.scenarios.length === 3) {
            set({ scenarios: full.scenarios, metadata: full.analysis_metadata })
          }
        } catch {
          // Nothing to do
        }
      }
    } finally {
      set({ isStreaming: false })
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  reset: () =>
    set({ scenarios: [], activeTab: "A", isStreaming: false, metadata: null }),
}))
