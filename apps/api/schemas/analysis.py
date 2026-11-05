from pydantic import BaseModel, Field, model_validator
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

MAX_SUPPORT_CHUNKS = 100
MAX_CHUNK_CHARS = 20_000


class TargetProfile(BaseModel):
    id: str
    name: str = Field(min_length=1)
    country_code: str = Field(min_length=2, max_length=2)


class GeopoliticalContext(BaseModel):
    region: str
    description: str


class DiplomaticObjective(BaseModel):
    type: str
    description: str


class SupportDocument(BaseModel):
    """A pre-ingested document chunk (shape returned by POST /documents/ingest)."""

    content: str = Field(max_length=MAX_CHUNK_CHARS)
    source: str = Field(max_length=512)
    chunk_index: int = Field(default=0, ge=0)


OutputLanguage = Literal["es", "en", "zh", "hi", "ar", "pt", "fr", "bn", "ru", "ur"]

LANGUAGE_NAMES: dict[str, str] = {
    "es": "Spanish",
    "en": "English",
    "zh": "Mandarin Chinese",
    "hi": "Hindi",
    "ar": "Arabic",
    "pt": "Portuguese",
    "fr": "French",
    "bn": "Bengali",
    "ru": "Russian",
    "ur": "Urdu",
}


class AnalysisCaseDTO(BaseModel):
    target_profiles: list[TargetProfile] = Field(min_length=1)
    geopolitical_context: GeopoliticalContext
    diplomatic_objective: DiplomaticObjective
    scoring_weights: ScoringWeights
    analysis_period_years: Literal[5, 10, 20]
    support_documents: list[SupportDocument] = Field(default_factory=list, max_length=MAX_SUPPORT_CHUNKS)
    # S_historial inputs (Art. 38 CIJ hierarchy) and litigation penalty
    treaties: list[Treaty] = Field(default_factory=list, max_length=500)
    icj_cases: int = Field(default=0, ge=0, le=50)
    # Optional analyst overrides (0-100). When omitted, S_afinidad is derived
    # from the seeded graph affinity of the target countries and S_intereses
    # falls back to a neutral 50.
    s_affinity: float | None = Field(default=None, ge=0, le=100)
    s_interests: float | None = Field(default=None, ge=0, le=100)
    # Output language for LLM-generated text
    output_language: OutputLanguage = "es"
    # LLM model selection
    llm_model: Literal["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"] = "claude-haiku-5-5"


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
    score_total: float = Field(ge=0, le=100)
    viability_score: float = Field(ge=0, le=100)
    sources: list[SourceCitation]
    chain_of_thought: str = Field(min_length=1)


class AnalysisMetadata(BaseModel):
    model_used: str
    processing_time_s: float
    rag_sources_count: int


class ThreeScenariosResult(BaseModel):
    scenarios: Annotated[list[Scenario], Len(3, 3)]
    analysis_metadata: AnalysisMetadata


class AnalysisResponse(ThreeScenariosResult):
    """POST /analysis/ response: LLM scenarios plus the deterministic pre-LLM score."""

    scoring: ScoringResult
