import type { AnalysisCaseDTO } from "@/lib/schemas/analysis"

export async function submitAnalysis(caseDTO: AnalysisCaseDTO): Promise<Response> {
  return fetch("/api/proxy/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(caseDTO),
  })
}
