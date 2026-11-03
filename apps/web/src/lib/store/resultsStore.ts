import { create } from "zustand"
import type { AnalysisResponse, Scenario, ScoringResult, ThreeScenariosResult } from "@/lib/types/results"
import type { AnalysisCaseDTO } from "@/lib/schemas/analysis"
import { readErrorMessage, submitAnalysis } from "@/lib/services/analysisService"

interface ResultsState {
  scenarios: Scenario[]
  activeTab: "A" | "B" | "C"
  isStreaming: boolean
  error: string | null
  metadata: ThreeScenariosResult["analysis_metadata"] | null
  scoring: ScoringResult | null
  streamScenarios: (caseDTO: AnalysisCaseDTO) => Promise<void>
  setActiveTab: (tab: "A" | "B" | "C") => void
  reset: () => void
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object"
}

function isScenario(value: unknown): value is Scenario {
  return (
    isObject(value) &&
    (value.label === "A" || value.label === "B" || value.label === "C") &&
    typeof value.name === "string" &&
    typeof value.score_total === "number" &&
    typeof value.viability_score === "number" &&
    Array.isArray(value.roadmap)
  )
}

function isFullResult(value: unknown): value is AnalysisResponse {
  return isObject(value) && Array.isArray(value.scenarios) && value.scenarios.every(isScenario)
}

const INITIAL = {
  scenarios: [] as Scenario[],
  activeTab: "A" as const,
  isStreaming: false,
  error: null,
  metadata: null,
  scoring: null,
}

export const useResultsStore = create<ResultsState>((set, get) => ({
  ...INITIAL,

  /**
   * Single request per analysis. Accepts either the backend's full JSON body
   * (current FastAPI contract) or NDJSON lines (one Scenario per line, then the
   * full result) — both are parsed line by line.
   */
  streamScenarios: async (caseDTO: AnalysisCaseDTO) => {
    // Re-entrancy guard (React StrictMode double effects, double clicks)
    if (get().isStreaming) return
    set({ isStreaming: true, scenarios: [], metadata: null, scoring: null, error: null })

    const parsedScenarios: Scenario[] = []
    const processLine = (line: string) => {
      if (!line.trim()) return
      let parsed: unknown
      try {
        parsed = JSON.parse(line)
      } catch {
        return // partial / non-JSON line
      }
      if (isFullResult(parsed)) {
        set({
          scenarios: parsed.scenarios,
          metadata: parsed.analysis_metadata ?? null,
          scoring: parsed.scoring ?? null,
        })
      } else if (isScenario(parsed)) {
        parsedScenarios.push(parsed)
        set({ scenarios: [...parsedScenarios] })
      }
    }

    try {
      const response = await submitAnalysis(caseDTO)
      if (!response.ok) {
        set({ error: await readErrorMessage(response) })
        return
      }

      const reader = response.body?.getReader()
      if (reader) {
        const decoder = new TextDecoder()
        let buffer = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) processLine(line)
        }
        buffer += decoder.decode()
        if (buffer) processLine(buffer)
      } else {
        const text = await response.text()
        for (const line of text.split("\n")) processLine(line)
      }

      if (get().scenarios.length === 0) {
        set({ error: "La respuesta del servidor no contenía escenarios válidos." })
      }
    } catch (err) {
      console.error("[resultsStore] analysis request failed:", err)
      set({ error: "No se pudo contactar al servidor de análisis. Verifique su conexión." })
    } finally {
      set({ isStreaming: false })
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  reset: () => set({ ...INITIAL }),
}))
