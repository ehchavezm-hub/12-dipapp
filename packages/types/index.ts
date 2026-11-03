export type Role = "superadmin" | "editor" | "viewer"

export type GeopoliticRegion =
  | "americas"
  | "europe"
  | "asia_pacific"
  | "africa"
  | "middle_east"
  | "oceania"

export type TreatyLevel = 1 | 2 | 3

export interface DiplomaticNode {
  id: string
  type: "country" | "embassy" | "diplomat" | "organization"
  label: string
  region: GeopoliticRegion
  affinityScore: number
  clusterId: string
}

export interface DiplomaticEdge {
  source: string
  target: string
  type: "bilateral_treaty" | "trade_agreement" | "un_vote_alignment" | "dispute"
  weight: number
  treatyLevel: TreatyLevel
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
  region?: GeopoliticRegion
}

export interface AnalysisRequest {
  id: string
  userId: string
  title: string
  description: string
  region: GeopoliticRegion
  createdAt: string
  status: "pending" | "processing" | "completed" | "failed"
}

export interface AnalysisResult {
  id: string
  requestId: string
  summary: string
  nodes: DiplomaticNode[]
  edges: DiplomaticEdge[]
  riskScore: number
  recommendations: string[]
  createdAt: string
}
