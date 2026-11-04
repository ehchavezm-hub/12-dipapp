"""Analysis router: POST /analysis — runs geopolitical scoring + LLM orchestration."""
import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

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


@router.post("/")
async def run_analysis(
    case: AnalysisCaseDTO,
    claims: JWTClaims = Depends(require_role(Role.EDITOR)),
) -> StreamingResponse:
    """Run geopolitical scoring + LLM scenario generation.

    Returns NDJSON: one Scenario JSON per line (A, B, C), then the full
    AnalysisResponse as the last line. The frontend reads lines progressively
    so each scenario appears as soon as the LLM finishes.

    Requires EDITOR role or higher. Returns 502 when every LLM provider fails.
    """
    if case.support_documents:
        case.support_documents = _sanitize_support_documents(case.support_documents)

    scores = GeopoliticalScorer().compute(case)

    try:
        result = await orchestrate(case, scores)
    except Exception as exc:
        logger.error("LLM orchestration failed for sub=%s: %s", claims["sub"], exc)
        msg = str(exc)
        if "not configured" in msg:
            # Configuration error — retrying won't help
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Server configuration error: {msg}. Contact the administrator.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM providers unavailable — please retry in a few moments",
        ) from exc

    full_response = AnalysisResponse(
        scenarios=result.scenarios,
        analysis_metadata=result.analysis_metadata,
        scoring=scores,
    )

    async def _ndjson_stream() -> AsyncIterator[str]:
        # Emit each scenario immediately so the browser can render it
        for scenario in full_response.scenarios:
            yield json.dumps(scenario.model_dump()) + "\n"
        # Final line: full payload (includes scoring + metadata)
        yield full_response.model_dump_json() + "\n"

    return StreamingResponse(
        _ndjson_stream(),
        media_type="application/x-ndjson",
        headers={"X-Content-Type-Options": "nosniff"},
    )
