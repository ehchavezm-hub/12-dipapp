"""Analysis router: POST /analysis — runs geopolitical scoring + LLM orchestration."""
from fastapi import APIRouter, Depends

from middleware.auth import JWTClaims, Role, require_role
from middleware.rate_limit import check_rate_limit
from schemas.analysis import AnalysisCaseDTO, ThreeScenariosResult
from services.llm_orchestrator import orchestrate
from services.scoring import GeopoliticalScorer

router = APIRouter(prefix="/analysis", tags=["analysis"], dependencies=[Depends(check_rate_limit)])


@router.post("/", response_model=ThreeScenariosResult)
async def run_analysis(
    case: AnalysisCaseDTO,
    claims: JWTClaims = Depends(require_role(Role.EDITOR)),
) -> ThreeScenariosResult:
    """Run geopolitical scoring and LLM scenario generation.

    Requires EDITOR role or higher.
    """
    scores = GeopoliticalScorer().compute(case)
    return await orchestrate(case, scores)
