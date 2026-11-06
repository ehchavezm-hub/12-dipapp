"""Ambassadors router — list of current ambassadors from Wikidata."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from middleware.auth import JWTClaims, Role, require_role
from middleware.rate_limit import check_rate_limit
from services.data_pipeline.ambassadors import fetch_ambassadors
from services.data_pipeline import cache as C

log = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ambassadors",
    tags=["ambassadors"],
    dependencies=[Depends(check_rate_limit)],
)


@router.get("")
async def list_ambassadors(
    _claims: Annotated[JWTClaims, Depends(require_role(Role.VIEWER))],
    background_tasks: BackgroundTasks,
    refresh: bool = Query(False),
) -> dict:
    """Return current ambassadors list. Cached 12h; pass ?refresh=true to force reload."""
    if refresh:
        C.invalidate("ambassadors_combined_v2")

    records = fetch_ambassadors()
    return {
        "total": len(records),
        "ambassadors": records,
    }
