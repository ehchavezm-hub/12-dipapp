"""Analysis router: POST /analysis — runs geopolitical scoring + LLM orchestration."""
from fastapi import APIRouter, Depends

from middleware.auth import JWTClaims, Role, require_role
from middleware.rate_limit import check_rate_limit
from schemas.analysis import AnalysisCaseDTO, ThreeScenariosResult
from services.llm_orchestrator import orchestrate
from services.pdf_pipeline import DocumentChunk, sanitize_chunks
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
    # Sanitize any pre-ingested document chunks
    raw_docs = case.support_documents
    if raw_docs:
        chunks = [
            DocumentChunk(
                content=str(d.get("content", "") if isinstance(d, dict) else getattr(d, "content", "")),
                source=str(d.get("source", "") if isinstance(d, dict) else getattr(d, "source", "")),
                chunk_index=i,
            )
            for i, d in enumerate(raw_docs)
        ]
        sanitized = sanitize_chunks(chunks)
        object.__setattr__(case, "support_documents", sanitized)
    scores = GeopoliticalScorer().compute(case)
    return await orchestrate(case, scores)
