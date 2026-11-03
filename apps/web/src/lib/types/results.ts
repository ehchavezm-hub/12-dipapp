export interface RoadmapStep {
  step: number
  action: string
  timeline: string
  responsible: string
}

export interface SourceCitation {
  title: string
  url: string
  date: string
}

export interface Scenario {
  label: "A" | "B" | "C"
  name: string
  strategy: string
  roadmap: RoadmapStep[]
  pros: string[]
  cons: string[]
  leverage_points: string[]
  score_total: number
  viability_score: number
  sources: SourceCitation[]
  chain_of_thought: string
}

export interface AnalysisMetadata {
  model_used: string
  processing_time_s: number
  rag_sources_count: number
}

export interface ThreeScenariosResult {
  scenarios: [Scenario, Scenario, Scenario]
  analysis_metadata: AnalysisMetadata
}
