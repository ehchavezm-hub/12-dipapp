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

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      const parsedScenarios: Scenario[] = []
      let buffer = ""

      function processLine(line: string) {
        if (!line.trim()) return
        try {
          const parsed: unknown = JSON.parse(line)
          if (
            parsed !== null &&
            typeof parsed === "object" &&
            "scenarios" in parsed &&
            Array.isArray((parsed as ThreeScenariosResult).scenarios)
          ) {
            const full = parsed as ThreeScenariosResult
            set({ scenarios: full.scenarios, metadata: full.analysis_metadata })
          } else if (parsed !== null && typeof parsed === "object" && "label" in parsed) {
            parsedScenarios.push(parsed as Scenario)
            set({ scenarios: [...parsedScenarios] })
          }
        } catch {
          // skip unparseable lines
        }
      }

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) processLine(line)
        }
        if (buffer) processLine(buffer)
      } else {
        // Fallback: buffer entire response
        const text = await response.clone().text()
        for (const line of text.split("\n")) processLine(line)
      }
    } finally {
      set({ isStreaming: false })
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  reset: () =>
    set({ scenarios: [], activeTab: "A", isStreaming: false, metadata: null }),
}))
