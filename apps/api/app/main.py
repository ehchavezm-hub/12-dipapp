"""DipApp FastAPI entry point."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from routers.analysis import router as analysis_router
from routers.documents import router as documents_router
from routers.graph import router as graph_router
from schemas.errors import ProblemDetail

app = FastAPI(
    title="DipApp API",
    description="Diplomatic Intelligence Platform backend",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# RFC 7807 Problem Details exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Return RFC 7807 Problem Details for all HTTP errors."""
    problem = ProblemDetail(
        type=f"https://httpstatuses.com/{exc.status_code}",
        title=_STATUS_TITLES.get(exc.status_code, "Error"),
        status=exc.status_code,
        detail=str(exc.detail),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=problem.model_dump(),
        media_type="application/problem+json",
    )


_STATUS_TITLES: dict[int, str] = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
app.include_router(graph_router)
app.include_router(documents_router)
app.include_router(analysis_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "dipapp-api"}
