"""Source: Wikidata SPARQL — current ambassadors (P39 position held).

Fetches people who currently hold ambassador positions, with:
- Ambassador name
- Sending country (ISO 3166-1 alpha-3)
- Receiving country (ISO 3166-1 alpha-3)
- Start date of appointment

When P131/P17 on the position item are missing, the destination country
is extracted from the position label (e.g. "Ambassador of Japan to France").
"""
from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from . import cache as C

log = logging.getLogger(__name__)

_SPARQL_URL = "https://query.wikidata.org/sparql"

# Two UNION patterns to maximise Wikidata coverage:
#   Pattern A: position item is an INSTANCE (P31) of Q121998 or any subclass thereof.
#   Pattern B: position item is itself a SUBCLASS (P279) of Q121998.
# posLabel is included so we can extract destination country from titles like
# "Ambassador of Japan to France" when P131/P17 on the position item is absent.
# P131 sometimes points to a city; we follow P17 up one level to get the country.
_QUERY = """
SELECT DISTINCT
  ?personLabel
  ?posLabel
  ?fromCountryCode
  ?toCountryCode
  ?startDate
WHERE {
  ?person wdt:P31 wd:Q5 ;
          p:P39 ?stmt .
  ?stmt ps:P39 ?pos .
  { ?pos wdt:P31/wdt:P279* wd:Q121998 }
  UNION
  { ?pos wdt:P279+ wd:Q121998 }
  FILTER NOT EXISTS { ?stmt pq:P582 [] }
  OPTIONAL {
    ?pos wdt:P17 ?fromCountry .
    ?fromCountry wdt:P298 ?fromCountryCode .
  }
  OPTIONAL {
    ?pos wdt:P131 ?toPlace .
    OPTIONAL { ?toPlace wdt:P298 ?toCountryCode . }
    OPTIONAL {
      ?toPlace wdt:P17 ?toViaCity .
      ?toViaCity wdt:P298 ?toCountryCode .
    }
  }
  OPTIONAL { ?stmt pq:P580 ?startDate }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es" }
}
ORDER BY ?fromCountryCode ?personLabel
LIMIT 8000
"""


def fetch_ambassadors() -> list[dict[str, Any]]:
    """Return list of current ambassadors from Wikidata. Cached 12h."""
    cache_key = "wikidata_ambassadors_v2"
    cached = C.get(cache_key)
    if cached is not None:
        return cached

    try:
        resp = httpx.post(
            _SPARQL_URL,
            data={"query": _QUERY, "format": "json"},
            headers={
                "Accept": "application/sparql-results+json",
                "User-Agent": "DipApp/1.0 (automated academic research)",
            },
            timeout=120,
            follow_redirects=True,
        )
        resp.raise_for_status()
        bindings = resp.json().get("results", {}).get("bindings", [])
    except Exception as exc:
        log.error("Wikidata ambassadors SPARQL failed: %s — %s", type(exc).__name__, exc)
        return []

    seen: set[tuple[str, str, str]] = set()
    records: list[dict[str, Any]] = []

    for row in bindings:
        name = row.get("personLabel", {}).get("value", "")
        pos_label = row.get("posLabel", {}).get("value", "")
        from_code = row.get("fromCountryCode", {}).get("value", "").upper()
        to_code = row.get("toCountryCode", {}).get("value", "").upper()
        raw_date = row.get("startDate", {}).get("value", "")

        # Skip anonymous Wikidata items (Q-number labels)
        if not name or name.startswith("Q"):
            continue

        # Fallback: extract countries from position label when SPARQL codes are absent
        if not to_code and pos_label:
            to_code = _extract_to_country(pos_label)
        if not from_code and pos_label:
            from_code = _extract_from_country(pos_label)

        if not from_code and not to_code:
            continue

        key = (name, from_code, to_code)
        if key in seen:
            continue
        seen.add(key)

        records.append({
            "name": name,
            "fromCountry": from_code,
            "toCountry": to_code,
            "startDate": raw_date[:10] if raw_date else "",
        })

    if records:
        C.set(cache_key, records, ttl=C.AMBASSADOR_TTL)
        log.info("Fetched %d ambassador records from Wikidata", len(records))
    else:
        log.warning("Wikidata ambassadors returned 0 records — not caching")
    return records


# ---------------------------------------------------------------------------
# Country name → ISO-3 mapping for label parsing
# ---------------------------------------------------------------------------

_NAME_TO_ISO: dict[str, str] = {
    "afghanistan": "AFG", "albania": "ALB", "algeria": "DZA", "andorra": "AND",
    "angola": "AGO", "antigua": "ATG", "argentina": "ARG", "armenia": "ARM",
    "australia": "AUS", "austria": "AUT", "azerbaijan": "AZE",
    "bahrain": "BHR", "bangladesh": "BGD", "barbados": "BRB", "belarus": "BLR",
    "belgium": "BEL", "belize": "BLZ", "benin": "BEN", "bhutan": "BTN",
    "bolivia": "BOL", "bosnia": "BIH", "botswana": "BWA", "brazil": "BRA",
    "brunei": "BRN", "bulgaria": "BGR", "burkina faso": "BFA", "burundi": "BDI",
    "cabo verde": "CPV", "cape verde": "CPV", "cambodia": "KHM",
    "cameroon": "CMR", "canada": "CAN", "central african": "CAF", "chad": "TCD",
    "chile": "CHL", "china": "CHN", "colombia": "COL", "comoros": "COM",
    "congo": "COG", "costa rica": "CRI", "croatia": "HRV", "cuba": "CUB",
    "cyprus": "CYP", "czech": "CZE",
    "democratic republic of the congo": "COD", "denmark": "DNK",
    "djibouti": "DJI", "dominica": "DMA", "dominican": "DOM",
    "ecuador": "ECU", "egypt": "EGY", "el salvador": "SLV", "eritrea": "ERI",
    "estonia": "EST", "eswatini": "SWZ", "ethiopia": "ETH",
    "fiji": "FJI", "finland": "FIN", "france": "FRA",
    "gabon": "GAB", "gambia": "GMB", "georgia": "GEO", "germany": "DEU",
    "ghana": "GHA", "greece": "GRC", "grenada": "GRD", "guatemala": "GTM",
    "guinea": "GIN", "guinea-bissau": "GNB", "guyana": "GUY",
    "haiti": "HTI", "honduras": "HND", "hungary": "HUN",
    "iceland": "ISL", "india": "IND", "indonesia": "IDN", "iran": "IRN",
    "iraq": "IRQ", "ireland": "IRL", "israel": "ISR", "italy": "ITA",
    "ivory coast": "CIV", "côte d'ivoire": "CIV",
    "jamaica": "JAM", "japan": "JPN", "jordan": "JOR",
    "kazakhstan": "KAZ", "kenya": "KEN", "kuwait": "KWT", "kyrgyzstan": "KGZ",
    "laos": "LAO", "latvia": "LVA", "lebanon": "LBN", "lesotho": "LSO",
    "liberia": "LBR", "libya": "LBY", "liechtenstein": "LIE",
    "lithuania": "LTU", "luxembourg": "LUX",
    "madagascar": "MDG", "malawi": "MWI", "malaysia": "MYS",
    "maldives": "MDV", "mali": "MLI", "malta": "MLT", "mauritania": "MRT",
    "mauritius": "MUS", "mexico": "MEX", "moldova": "MDA", "monaco": "MCO",
    "mongolia": "MNG", "montenegro": "MNE", "morocco": "MAR",
    "mozambique": "MOZ", "myanmar": "MMR",
    "namibia": "NAM", "nepal": "NPL", "netherlands": "NLD",
    "new zealand": "NZL", "nicaragua": "NIC", "niger": "NER", "nigeria": "NGA",
    "north korea": "PRK", "north macedonia": "MKD", "norway": "NOR",
    "oman": "OMN",
    "pakistan": "PAK", "panama": "PAN", "papua new guinea": "PNG",
    "paraguay": "PRY", "peru": "PER", "philippines": "PHL",
    "poland": "POL", "portugal": "PRT",
    "qatar": "QAT",
    "romania": "ROU", "russia": "RUS", "rwanda": "RWA",
    "saint kitts": "KNA", "saint lucia": "LCA", "saint vincent": "VCT",
    "samoa": "WSM", "san marino": "SMR", "saudi arabia": "SAU",
    "senegal": "SEN", "serbia": "SRB", "seychelles": "SYC",
    "sierra leone": "SLE", "singapore": "SGP", "slovakia": "SVK",
    "slovenia": "SVN", "somalia": "SOM", "south africa": "ZAF",
    "south korea": "KOR", "south sudan": "SSD", "spain": "ESP",
    "sri lanka": "LKA", "sudan": "SDN", "suriname": "SUR",
    "sweden": "SWE", "switzerland": "CHE", "syria": "SYR",
    "taiwan": "TWN", "tajikistan": "TJK", "tanzania": "TZA",
    "thailand": "THA", "timor-leste": "TLS", "togo": "TGO",
    "trinidad": "TTO", "tunisia": "TUN", "turkey": "TUR",
    "turkmenistan": "TKM",
    "uganda": "UGA", "ukraine": "UKR", "united arab emirates": "ARE",
    "united kingdom": "GBR", "united states": "USA", "uruguay": "URY",
    "uzbekistan": "UZB",
    "vanuatu": "VUT", "venezuela": "VEN", "vietnam": "VNM",
    "yemen": "YEM",
    "zambia": "ZMB", "zimbabwe": "ZWE",
}


def _match_country(fragment: str) -> str:
    """Return ISO-3 for the longest matching country name in fragment."""
    best, best_len = "", 0
    for name, code in _NAME_TO_ISO.items():
        if name in fragment and len(name) > best_len:
            best, best_len = code, len(name)
    return best


def _extract_to_country(label: str) -> str:
    """Extract ISO-3 destination from 'Ambassador of X to Y' style label."""
    label_lower = label.lower()
    for pattern in (r"\bto\s+(.+?)(?:\s*$|\s*\()", r"\bin\s+(.+?)(?:\s*$|\s*\()"):
        m = re.search(pattern, label_lower)
        if m:
            code = _match_country(m.group(1).strip().rstrip(")"))
            if code:
                return code
    return ""


def _extract_from_country(label: str) -> str:
    """Extract ISO-3 sending country from 'Ambassador of X to Y' style label."""
    label_lower = label.lower()
    m = re.search(r"\bof\s+(.+?)\s+to\b", label_lower)
    if m:
        code = _match_country(m.group(1).strip())
        if code:
            return code
    return ""
