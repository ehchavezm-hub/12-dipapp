"""Graph data router — real data from 8 verified public sources."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from middleware.auth import JWTClaims, Role, require_role
from middleware.rate_limit import check_rate_limit
from schemas.graph import DiplomaticEdgeSchema, DiplomaticNodeSchema, GraphDataResponse
from services.data_pipeline import build_graph

log = logging.getLogger(__name__)

router = APIRouter(prefix="/graph", tags=["graph"], dependencies=[Depends(check_rate_limit)])


def _safe_node(raw: dict) -> DiplomaticNodeSchema | None:
    try:
        return DiplomaticNodeSchema(**raw)
    except Exception:
        return None


def _safe_edge(raw: dict) -> DiplomaticEdgeSchema | None:
    try:
        return DiplomaticEdgeSchema(**raw)
    except Exception:
        return None


@router.get("/data", response_model=GraphDataResponse)
async def get_graph_data(
    background_tasks: BackgroundTasks,
    _claims: JWTClaims = Depends(require_role(Role.VIEWER)),
    refresh: Annotated[bool, Query(description="Force rebuild from all sources")] = False,
) -> GraphDataResponse:
    """Return diplomatic graph built from 8 real verified public data sources."""
    if refresh:
        # Rebuild in background; return current cached data immediately
        background_tasks.add_task(_refresh_graph)

    data = build_graph(force_refresh=False)

    nodes = [n for raw in data["nodes"] if (n := _safe_node(raw))]
    edges = [e for raw in data["edges"] if (e := _safe_edge(raw))]

    return GraphDataResponse(nodes=nodes, edges=edges)


def _refresh_graph() -> None:
    """Background task: rebuild graph from all sources and update cache."""
    try:
        build_graph(force_refresh=True)
        log.info("Graph refresh complete")
    except Exception as exc:
        log.error("Graph refresh failed: %s", exc)
