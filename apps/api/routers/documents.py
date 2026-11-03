"""Documents router: PDF ingestion endpoint."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile

from middleware.auth import JWTClaims, Role, require_role
from middleware.rate_limit import check_rate_limit
from services.pdf_pipeline import DocumentChunk, ingest_pdf_bytes

router = APIRouter(prefix="/documents", tags=["documents"], dependencies=[Depends(check_rate_limit)])

_MAX_BYTES = 500 * 1024  # 500 KB


@router.post("/ingest", response_model=list[DocumentChunk])
async def ingest_document(
    file: UploadFile,
    claims: JWTClaims = Depends(require_role(Role.EDITOR)),
) -> list[DocumentChunk]:
    """Ingest a PDF file and return its text chunks. Max 500 KB."""
    data = await file.read(_MAX_BYTES + 1)
    if len(data) > _MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Archivo mayor a 500 KB. Reduzca el tamaño del PDF antes de subir.",
        )
    try:
        return await ingest_pdf_bytes(data, filename=file.filename or "upload.pdf")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
