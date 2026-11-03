"""Analysis router: POST /analysis — runs geopolitical scoring + LLM orchestration."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from middleware.auth import JWTClaims, Role, require_role
from middleware.rate_limit import check_rate_limit
from schemas.analysis import AnalysisCaseDTO, AnalysisResponse, SupportDocument
from services.llm_orchestrator import orchestrate
from services.pdf_pipeline import DocumentChunk, sanitize_chunks
from services.scoring import GeopoliticalScorer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"], dependencies=[Depends(check_rate_limit)])


def _sanitize_support_documents(docs: list[SupportDocument]) -> list[SupportDocument]:
    """Re-sanitize client-supplied chunks: the browser can tamper with ingest output."""
    chunks = [DocumentChunk(content=d.content, source=d.source, chunk_index=d.chunk_index) for d in docs]
    return [
        SupportDocument(content=c.content, source=c.source, chunk_index=c.chunk_index)
        for c in sanitize_chunks(chunks)
    ]


@router.post("/", response_model=AnalysisResponse)
async def run_analysis(
    case: AnalysisCaseDTO,
    claims: JWTClaims = Depends(require_role(Role.EDITOR)),
) -> AnalysisResponse:
    """Run deterministic geopolitical scoring, then LLM scenario generation.

    Requires EDITOR role or higher. Returns 502 (RFC 7807) when every LLM
    provider fails.
    """
    if case.support_documents:
        case.support_documents = _sanitize_support_documents(case.support_documents)

    scores = GeopoliticalScorer().compute(case)

    try:
        result = await orchestrate(case, scores)
    except Exception as exc:  # both Anthropic and the OpenAI fallback failed
        logger.error("LLM orchestration failed for sub=%s: %s", claims["sub"], exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM providers unavailable — please retry in a few moments",
        ) from exc

    return AnalysisResponse(
        scenarios=result.scenarios,
        analysis_metadata=result.analysis_metadata,
        scoring=scores,
    )
