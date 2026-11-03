from pydantic import BaseModel, model_validator
from typing import Literal, Annotated
from annotated_types import Len

TreatyLevel = Literal[1, 2, 3]


class ScoringWeights(BaseModel):
    w_affinity: float = 0.40
    w_history: float = 0.35
    w_interests: float = 0.25

    @model_validator(mode="after")
    def weights_must_sum_to_one(self) -> "ScoringWeights":
        total = self.w_affinity + self.w_history + self.w_interests
        if not abs(total - 1.0) < 0.001:
            raise ValueError(f"Weights must sum to 1.0, got {total:.4f}")
        return self


class Treaty(BaseModel):
    level: TreatyLevel
    active: bool


class ScoreBreakdown(BaseModel):
    affinity: float
    history: float
    interests: float


class ScoringResult(BaseModel):
    score_total: float       # clamped to [0, 100]
    breakdown: ScoreBreakdown
    litigation_penalty: float


# ---------------------------------------------------------------------------
# Analysis Case DTOs (added in Task 7)
# ---------------------------------------------------------------------------

class TargetProfile(BaseModel):
    id: str
    name: str
    country_code: str


class GeopoliticalContext(BaseModel):
    region: str
    description: str


class DiplomaticObjective(BaseModel):
    type: str
    description: str


class AnalysisCaseDTO(BaseModel):
    target_profiles: list[TargetProfile]
    geopolitical_context: GeopoliticalContext
    diplomatic_objective: DiplomaticObjective
    scoring_weights: ScoringWeights
    analysis_period_years: Literal[5, 10, 20]
    support_documents: list = []  # list[DocumentChunk] — avoid circular import


class RoadmapStep(BaseModel):
    step: int
    action: str
    timeline: str
    responsible: str


class SourceCitation(BaseModel):
    title: str
    url: str
    date: str


class Scenario(BaseModel):
    label: Literal["A", "B", "C"]
    name: str
    strategy: str
    roadmap: list[RoadmapStep]
    pros: list[str]
    cons: list[str]
    leverage_points: list[str]
    score_total: float
    viability_score: float
    sources: list[SourceCitation]
    chain_of_thought: str


class AnalysisMetadata(BaseModel):
    model_used: str
    processing_time_s: float
    rag_sources_count: int


class ThreeScenariosResult(BaseModel):
    scenarios: Annotated[list[Scenario], Len(3, 3)]
    analysis_metadata: AnalysisMetadata
