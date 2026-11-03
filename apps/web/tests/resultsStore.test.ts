import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useResultsStore } from "@/lib/store/resultsStore"
import { EXAMPLE_CASE } from "@/lib/store/analysisStore"
import type { Scenario } from "@/lib/types/results"

function scenario(label: "A" | "B" | "C"): Scenario {
  return {
    label,
    name: `Escenario ${label}`,
    strategy: "s",
    roadmap: [{ step: 1, action: "a", timeline: "Q1", responsible: "MRE" }],
    pros: [],
    cons: [],
    leverage_points: [],
    score_total: 60,
    viability_score: 70,
    sources: [],
    chain_of_thought: "cot",
  }
}

const fullResult = {
  scenarios: [scenario("A"), scenario("B"), scenario("C")],
  analysis_metadata: { model_used: "claude-opus-4-5", processing_time_s: 3, rag_sources_count: 1 },
  scoring: { score_total: 42.3, breakdown: { affinity: 62, history: 50, interests: 50 }, litigation_penalty: 0 },
}

beforeEach(() => useResultsStore.getState().reset())
afterEach(() => vi.unstubAllGlobals())

describe("resultsStore.streamScenarios", () => {
  it("parses the backend's single-JSON response (current FastAPI contract)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(fullResult))))
    await useResultsStore.getState().streamScenarios(EXAMPLE_CASE)
    const s = useResultsStore.getState()
    expect(s.scenarios.map((x) => x.label)).toEqual(["A", "B", "C"])
    expect(s.scoring?.score_total).toBe(42.3)
    expect(s.error).toBeNull()
    expect(s.isStreaming).toBe(false)
  })

  it("parses NDJSON lines (one scenario per line)", async () => {
    const body = [scenario("A"), scenario("B"), scenario("C")].map((x) => JSON.stringify(x)).join("\n")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)))
    await useResultsStore.getState().streamScenarios(EXAMPLE_CASE)
    expect(useResultsStore.getState().scenarios).toHaveLength(3)
  })

  it("surfaces RFC 7807 detail on backend errors instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 502, detail: "LLM providers unavailable" }), { status: 502 })
      )
    )
    await expect(useResultsStore.getState().streamScenarios(EXAMPLE_CASE)).resolves.toBeUndefined()
    expect(useResultsStore.getState().error).toBe("LLM providers unavailable")
    expect(useResultsStore.getState().isStreaming).toBe(false)
  })

  it("reports network failures as a user-facing error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")))
    vi.spyOn(console, "error").mockImplementation(() => {})
    await useResultsStore.getState().streamScenarios(EXAMPLE_CASE)
    expect(useResultsStore.getState().error).toMatch(/No se pudo contactar/)
  })

  it("ignores concurrent calls (one LLM request per analysis)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(fullResult)))
    vi.stubGlobal("fetch", fetchMock)
    const store = useResultsStore.getState()
    await Promise.all([store.streamScenarios(EXAMPLE_CASE), store.streamScenarios(EXAMPLE_CASE)])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
