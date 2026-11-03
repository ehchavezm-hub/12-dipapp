import type { AnalysisCaseDTO } from "@/lib/schemas/analysis"

/** POST the analysis case to the authenticated Next.js proxy. */
export async function submitAnalysis(caseDTO: AnalysisCaseDTO): Promise<Response> {
  return fetch("/api/proxy/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson, application/json" },
    body: JSON.stringify(caseDTO),
  })
}

/** Extract a human-readable message from an RFC 7807 / JSON error response. */
export async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Error ${response.status} al generar el análisis`
  try {
    const body: unknown = await response.json()
    if (body !== null && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail: unknown }).detail
      if (typeof detail === "string" && detail) return detail
    }
  } catch {
    // non-JSON body
  }
  if (response.status === 401) return "Sesión expirada. Vuelva a iniciar sesión."
  if (response.status === 403) return "Su rol no permite generar análisis (requiere editor)."
  if (response.status === 429) return "Límite de 60 solicitudes por minuto alcanzado. Intente más tarde."
  return fallback
}
