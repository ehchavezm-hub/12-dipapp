"""Pydantic schemas for the graph data API."""
from typing import Literal

from pydantic import BaseModel


class DiplomaticNodeSchema(BaseModel):
    id: str
    type: Literal["country", "embassy", "diplomat", "organization"]
    label: str
    region: str  # GeopoliticRegion
    affinityScore: float  # 0–100
    clusterId: str


class DiplomaticEdgeSchema(BaseModel):
    source: str
    target: str
    type: Literal["bilateral_treaty", "trade_agreement", "un_vote_alignment", "dispute"]
    weight: float
    treatyLevel: Literal[1, 2, 3]


class GraphDataResponse(BaseModel):
    nodes: list[DiplomaticNodeSchema]
    edges: list[DiplomaticEdgeSchema]
