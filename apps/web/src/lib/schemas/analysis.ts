import { z } from "zod"

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
  name: z.string().min(1),
  country_code: z.string().length(2),
})

export const AnalysisCaseDTOSchema = z.object({
  target_profiles: z.array(TargetProfileSchema).min(1),
  geopolitical_context: z.object({
    region: z.string(),
    description: z.string(),
  }),
  diplomatic_objective: z.object({
    type: z.string(),
    description: z.string(),
  }),
  scoring_weights: ScoringWeightsSchema,
  analysis_period_years: z.union([
    z.literal(5),
    z.literal(10),
    z.literal(20),
  ]),
  support_documents: z.array(z.any()).default([]),
})

export type AnalysisCaseDTO = z.infer<typeof AnalysisCaseDTOSchema>
export type TargetProfile = z.infer<typeof TargetProfileSchema>
export type ScoringWeights = z.infer<typeof ScoringWeightsSchema>
