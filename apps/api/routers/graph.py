"""Graph data router — returns seeded diplomatic graph data."""
from fastapi import APIRouter, Depends

from middleware.auth import JWTClaims, Role, require_role
from middleware.rate_limit import check_rate_limit
from schemas.graph import GraphDataResponse
from services.graph_seed import EDGES, NODES

router = APIRouter(prefix="/graph", tags=["graph"], dependencies=[Depends(check_rate_limit)])


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/data", response_model=GraphDataResponse)
async def get_graph_data(
    _claims: JWTClaims = Depends(require_role(Role.VIEWER)),
) -> GraphDataResponse:
    """Return the full diplomatic graph dataset."""
    return GraphDataResponse(nodes=NODES, edges=EDGES)
