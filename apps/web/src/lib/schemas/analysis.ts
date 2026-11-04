import { z } from "zod"

/**
 * Mirrors `apps/api/schemas/analysis.py::AnalysisCaseDTO` (Pydantic v2).
 * Keep field names, optionality and bounds in sync with the backend.
 */

export const MAX_SUPPORT_CHUNKS = 100

export const DEFAULT_SCORING_WEIGHTS = {
  w_affinity: 0.4,
  w_history: 0.35,
  w_interests: 0.25,
} as const

export const ScoringWeightsSchema = z
  .object({
    w_affinity: z.number().min(0).max(1),
    w_history: z.number().min(0).max(1),
    w_interests: z.number().min(0).max(1),
  })
  .refine(
    (d) =>
      Math.abs(d.w_affinity + d.w_history + d.w_interests - 1.0) < 0.001,
    { message: "Los pesos deben sumar 1.0", path: ["w_affinity"] }
  )

export const TargetProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Ingrese el nombre del objetivo"),
  country_code: z.string().length(2, "El código de país debe tener 2 letras"),
})

/** Chunk returned by POST /documents/ingest (backend `DocumentChunk`). */
export const DocumentChunkSchema = z.object({
  content: z.string().max(20_000),
  source: z.string().max(512),
  chunk_index: z.number().int().min(0),
})

/** Art. 38 CIJ treaty hierarchy level (1 = ×3.0, 2 = ×2.0, 3 = ×1.0). */
export const TreatySchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  active: z.boolean(),
})

export const OUTPUT_LANGUAGE_OPTIONS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
] as const

export type OutputLanguage = "es" | "en" | "pt" | "fr"

export const AnalysisCaseDTOSchema = z.object({
  target_profiles: z.array(TargetProfileSchema).min(1),
  geopolitical_context: z.object({
    region: z.string().min(1, "Ingrese la región"),
    description: z.string(),
  }),
  diplomatic_objective: z.object({
    type: z.string().min(1, "Seleccione el tipo de objetivo"),
    description: z.string(),
  }),
  scoring_weights: ScoringWeightsSchema,
  analysis_period_years: z.union([
    z.literal(5),
    z.literal(10),
    z.literal(20),
  ]),
  support_documents: z
    .array(DocumentChunkSchema)
    .max(MAX_SUPPORT_CHUNKS, `Máximo ${MAX_SUPPORT_CHUNKS} fragmentos de documentos`)
    .default([]),
  treaties: z.array(TreatySchema).max(500).default([]),
  icj_cases: z.number().int().min(0).max(50).default(0),
  s_affinity: z.number().min(0).max(100).optional(),
  s_interests: z.number().min(0).max(100).optional(),
  output_language: z.enum(["es", "en", "pt", "fr"]).default("es"),
  llm_model: z.enum(["claude-haiku-3-5", "claude-sonnet-4-5", "claude-opus-4-5"]).default("claude-haiku-3-5"),
})

export type AnalysisCaseDTO = z.infer<typeof AnalysisCaseDTOSchema>
export type TargetProfile = z.infer<typeof TargetProfileSchema>
export type ScoringWeights = z.infer<typeof ScoringWeightsSchema>
export type DocumentChunk = z.infer<typeof DocumentChunkSchema>
export type Treaty = z.infer<typeof TreatySchema>
