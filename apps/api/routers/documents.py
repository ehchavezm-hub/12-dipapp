"""Documents router: PDF ingestion endpoint."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile

from middleware.auth import JWTClaims, Role, require_role
from middleware.rate_limit import check_rate_limit
from services.pdf_pipeline import DocumentChunk, ingest_pdf_bytes

router = APIRouter(prefix="/documents", tags=["documents"], dependencies=[Depends(check_rate_limit)])

_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/ingest", response_model=list[DocumentChunk])
async def ingest_document(
    file: UploadFile,
    claims: JWTClaims = Depends(require_role(Role.EDITOR)),
) -> list[DocumentChunk]:
    """Ingest a PDF file and return its text as document chunks.

    Requires EDITOR role or higher.  Files larger than 10 MB are rejected
    with HTTP 501 until pre-signed URL upload is implemented.
    """
    data = await file.read(_MAX_BYTES + 1)
    if len(data) > _MAX_BYTES:
        # Placeholder — R2/S3 not configured yet
        raise HTTPException(
            status_code=501,
            detail="Files >10MB: pre-signed URL not yet implemented",
        )
    try:
        return await ingest_pdf_bytes(data, filename=file.filename or "upload.pdf")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
