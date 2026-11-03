from pydantic import BaseModel, model_validator
from typing import Literal

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
