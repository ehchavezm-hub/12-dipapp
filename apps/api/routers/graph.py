"""Graph data router — returns seeded diplomatic graph data."""
from fastapi import APIRouter, Depends

from middleware.auth import JWTClaims, Role, require_role
from schemas.graph import DiplomaticEdgeSchema, DiplomaticNodeSchema, GraphDataResponse

router = APIRouter(prefix="/graph", tags=["graph"])

# ---------------------------------------------------------------------------
# Seeded data (~50 nodes across all 6 regions)
# ---------------------------------------------------------------------------

_NODES: list[DiplomaticNodeSchema] = [
    # Countries (10)
    DiplomaticNodeSchema(id="c-usa", type="country", label="United States", region="americas", affinityScore=85.0, clusterId="cluster-west"),
    DiplomaticNodeSchema(id="c-per", type="country", label="Peru", region="americas", affinityScore=62.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="c-chl", type="country", label="Chile", region="americas", affinityScore=70.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="c-bra", type="country", label="Brazil", region="americas", affinityScore=68.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="c-arg", type="country", label="Argentina", region="americas", affinityScore=55.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="c-gbr", type="country", label="United Kingdom", region="europe", affinityScore=88.0, clusterId="cluster-west"),
    DiplomaticNodeSchema(id="c-deu", type="country", label="Germany", region="europe", affinityScore=82.0, clusterId="cluster-eu"),
    DiplomaticNodeSchema(id="c-fra", type="country", label="France", region="europe", affinityScore=80.0, clusterId="cluster-eu"),
    DiplomaticNodeSchema(id="c-chn", type="country", label="China", region="asia_pacific", affinityScore=45.0, clusterId="cluster-asia"),
    DiplomaticNodeSchema(id="c-jpn", type="country", label="Japan", region="asia_pacific", affinityScore=78.0, clusterId="cluster-asia"),

    # Organizations (8)
    DiplomaticNodeSchema(id="o-un", type="organization", label="United Nations", region="americas", affinityScore=90.0, clusterId="cluster-intl"),
    DiplomaticNodeSchema(id="o-wto", type="organization", label="WTO", region="europe", affinityScore=75.0, clusterId="cluster-intl"),
    DiplomaticNodeSchema(id="o-imf", type="organization", label="IMF", region="americas", affinityScore=72.0, clusterId="cluster-intl"),
    DiplomaticNodeSchema(id="o-wb", type="organization", label="World Bank", region="americas", affinityScore=74.0, clusterId="cluster-intl"),
    DiplomaticNodeSchema(id="o-oas", type="organization", label="OAS", region="americas", affinityScore=65.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="o-asean", type="organization", label="ASEAN", region="asia_pacific", affinityScore=70.0, clusterId="cluster-asia"),
    DiplomaticNodeSchema(id="o-eu", type="organization", label="European Union", region="europe", affinityScore=84.0, clusterId="cluster-eu"),
    DiplomaticNodeSchema(id="o-nato", type="organization", label="NATO", region="europe", affinityScore=87.0, clusterId="cluster-west"),

    # Embassies (15)
    DiplomaticNodeSchema(id="e-usa-per", type="embassy", label="US Embassy Lima", region="americas", affinityScore=72.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="e-usa-chl", type="embassy", label="US Embassy Santiago", region="americas", affinityScore=76.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="e-usa-bra", type="embassy", label="US Embassy Brasília", region="americas", affinityScore=70.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="e-gbr-per", type="embassy", label="UK Embassy Lima", region="americas", affinityScore=68.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="e-gbr-chn", type="embassy", label="UK Embassy Beijing", region="asia_pacific", affinityScore=50.0, clusterId="cluster-asia"),
    DiplomaticNodeSchema(id="e-deu-jpn", type="embassy", label="German Embassy Tokyo", region="asia_pacific", affinityScore=80.0, clusterId="cluster-asia"),
    DiplomaticNodeSchema(id="e-fra-bra", type="embassy", label="French Embassy Brasília", region="americas", affinityScore=74.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="e-chn-per", type="embassy", label="Chinese Embassy Lima", region="americas", affinityScore=48.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="e-jpn-usa", type="embassy", label="Japanese Embassy Washington", region="americas", affinityScore=82.0, clusterId="cluster-west"),
    DiplomaticNodeSchema(id="e-bra-arg", type="embassy", label="Brazilian Embassy Buenos Aires", region="americas", affinityScore=60.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="e-usa-deu", type="embassy", label="US Embassy Berlin", region="europe", affinityScore=88.0, clusterId="cluster-eu"),
    DiplomaticNodeSchema(id="e-usa-fra", type="embassy", label="US Embassy Paris", region="europe", affinityScore=86.0, clusterId="cluster-eu"),
    DiplomaticNodeSchema(id="e-chn-deu", type="embassy", label="Chinese Embassy Berlin", region="europe", affinityScore=52.0, clusterId="cluster-eu"),
    DiplomaticNodeSchema(id="e-ind-un", type="embassy", label="India Mission UN", region="americas", affinityScore=66.0, clusterId="cluster-intl"),
    DiplomaticNodeSchema(id="e-bra-eu", type="embassy", label="Brazil Mission EU", region="europe", affinityScore=69.0, clusterId="cluster-eu"),

    # Diplomats (17)
    DiplomaticNodeSchema(id="d-amb-usa-per", type="diplomat", label="US Ambassador to Peru", region="americas", affinityScore=73.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="d-amb-usa-chl", type="diplomat", label="US Ambassador to Chile", region="americas", affinityScore=77.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="d-amb-gbr-per", type="diplomat", label="UK Ambassador to Peru", region="americas", affinityScore=67.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="d-amb-deu-jpn", type="diplomat", label="German Ambassador to Japan", region="asia_pacific", affinityScore=81.0, clusterId="cluster-asia"),
    DiplomaticNodeSchema(id="d-amb-jpn-usa", type="diplomat", label="Japanese Ambassador to US", region="americas", affinityScore=83.0, clusterId="cluster-west"),
    DiplomaticNodeSchema(id="d-amb-fra-bra", type="diplomat", label="French Ambassador to Brazil", region="americas", affinityScore=72.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="d-amb-chn-per", type="diplomat", label="Chinese Ambassador to Peru", region="americas", affinityScore=47.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="d-amb-bra-arg", type="diplomat", label="Brazilian Ambassador to Argentina", region="americas", affinityScore=58.0, clusterId="cluster-latam"),
    DiplomaticNodeSchema(id="d-amb-usa-deu", type="diplomat", label="US Ambassador to Germany", region="europe", affinityScore=89.0, clusterId="cluster-eu"),
    DiplomaticNodeSchema(id="d-amb-usa-fra", type="diplomat", label="US Ambassador to France", region="europe", affinityScore=85.0, clusterId="cluster-eu"),
    DiplomaticNodeSchema(id="d-amb-chn-deu", type="diplomat", label="Chinese Ambassador to Germany", region="europe", affinityScore=53.0, clusterId="cluster-eu"),
    DiplomaticNodeSchema(id="d-rep-un-bra", type="diplomat", label="Brazil UN Representative", region="americas", affinityScore=64.0, clusterId="cluster-intl"),
    DiplomaticNodeSchema(id="d-rep-un-chn", type="diplomat", label="China UN Representative", region="americas", affinityScore=44.0, clusterId="cluster-intl"),
    DiplomaticNodeSchema(id="d-rep-un-gbr", type="diplomat", label="UK UN Representative", region="americas", affinityScore=87.0, clusterId="cluster-intl"),
    DiplomaticNodeSchema(id="d-rep-un-fra", type="diplomat", label="France UN Representative", region="americas", affinityScore=84.0, clusterId="cluster-intl"),
    DiplomaticNodeSchema(id="d-rep-wto-usa", type="diplomat", label="US WTO Representative", region="europe", affinityScore=79.0, clusterId="cluster-intl"),
    DiplomaticNodeSchema(id="d-rep-wto-chn", type="diplomat", label="China WTO Representative", region="europe", affinityScore=42.0, clusterId="cluster-intl"),
]

_EDGES: list[DiplomaticEdgeSchema] = [
    # Bilateral treaties
    DiplomaticEdgeSchema(source="c-usa", target="c-gbr", type="bilateral_treaty", weight=0.95, treatyLevel=1),
    DiplomaticEdgeSchema(source="c-usa", target="c-jpn", type="bilateral_treaty", weight=0.85, treatyLevel=1),
    DiplomaticEdgeSchema(source="c-usa", target="c-deu", type="bilateral_treaty", weight=0.88, treatyLevel=1),
    DiplomaticEdgeSchema(source="c-deu", target="c-fra", type="bilateral_treaty", weight=0.90, treatyLevel=1),
    DiplomaticEdgeSchema(source="c-gbr", target="c-fra", type="bilateral_treaty", weight=0.82, treatyLevel=2),
    DiplomaticEdgeSchema(source="c-chl", target="c-per", type="bilateral_treaty", weight=0.65, treatyLevel=2),
    DiplomaticEdgeSchema(source="c-bra", target="c-arg", type="bilateral_treaty", weight=0.60, treatyLevel=2),
    DiplomaticEdgeSchema(source="c-usa", target="c-chl", type="bilateral_treaty", weight=0.72, treatyLevel=2),

    # Trade agreements
    DiplomaticEdgeSchema(source="c-usa", target="c-bra", type="trade_agreement", weight=0.68, treatyLevel=2),
    DiplomaticEdgeSchema(source="c-chn", target="c-per", type="trade_agreement", weight=0.55, treatyLevel=3),
    DiplomaticEdgeSchema(source="c-chn", target="c-bra", type="trade_agreement", weight=0.60, treatyLevel=3),
    DiplomaticEdgeSchema(source="c-jpn", target="c-usa", type="trade_agreement", weight=0.78, treatyLevel=1),
    DiplomaticEdgeSchema(source="c-deu", target="c-jpn", type="trade_agreement", weight=0.75, treatyLevel=2),
    DiplomaticEdgeSchema(source="o-eu", target="c-bra", type="trade_agreement", weight=0.65, treatyLevel=2),
    DiplomaticEdgeSchema(source="o-wto", target="c-chn", type="trade_agreement", weight=0.50, treatyLevel=3),

    # UN vote alignments
    DiplomaticEdgeSchema(source="c-usa", target="c-fra", type="un_vote_alignment", weight=0.80, treatyLevel=1),
    DiplomaticEdgeSchema(source="c-gbr", target="c-usa", type="un_vote_alignment", weight=0.85, treatyLevel=1),
    DiplomaticEdgeSchema(source="c-deu", target="c-fra", type="un_vote_alignment", weight=0.82, treatyLevel=1),
    DiplomaticEdgeSchema(source="c-bra", target="c-per", type="un_vote_alignment", weight=0.62, treatyLevel=2),
    DiplomaticEdgeSchema(source="c-chn", target="c-bra", type="un_vote_alignment", weight=0.45, treatyLevel=3),
    DiplomaticEdgeSchema(source="o-un", target="c-usa", type="un_vote_alignment", weight=0.75, treatyLevel=1),
    DiplomaticEdgeSchema(source="o-un", target="c-chn", type="un_vote_alignment", weight=0.50, treatyLevel=2),

    # Disputes
    DiplomaticEdgeSchema(source="c-chn", target="c-jpn", type="dispute", weight=0.30, treatyLevel=3),
    DiplomaticEdgeSchema(source="c-arg", target="c-gbr", type="dispute", weight=0.25, treatyLevel=3),
    DiplomaticEdgeSchema(source="c-per", target="c-chl", type="dispute", weight=0.35, treatyLevel=3),
    DiplomaticEdgeSchema(source="c-usa", target="c-chn", type="dispute", weight=0.28, treatyLevel=3),

    # Embassy to country links
    DiplomaticEdgeSchema(source="e-usa-per", target="c-per", type="bilateral_treaty", weight=0.70, treatyLevel=2),
    DiplomaticEdgeSchema(source="e-usa-chl", target="c-chl", type="bilateral_treaty", weight=0.74, treatyLevel=2),
    DiplomaticEdgeSchema(source="e-gbr-chn", target="c-chn", type="bilateral_treaty", weight=0.48, treatyLevel=3),
    DiplomaticEdgeSchema(source="e-chn-per", target="c-per", type="trade_agreement", weight=0.52, treatyLevel=3),
]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/data", response_model=GraphDataResponse)
async def get_graph_data(
    _claims: JWTClaims = Depends(require_role(Role.VIEWER)),
) -> GraphDataResponse:
    """Return the full diplomatic graph dataset."""
    return GraphDataResponse(nodes=_NODES, edges=_EDGES)
