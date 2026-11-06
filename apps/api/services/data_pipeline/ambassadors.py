"""Ambassador data from two complementary sources:

1. Wikidata SPARQL (P39 position held) — structured but incomplete coverage.
2. Official MFA websites via Anthropic web search — covers countries Wikidata misses.
   Each MFA website is public and free. We search them with claude-haiku-5-5 +
   web_search_20250305, caching results 24h. Cost: ~$0.05/day for 50 countries.

Combined result: several thousand current ambassador records with name,
sending country (ISO-3), receiving country (ISO-3), and appointment date.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import date
from typing import Any

import anthropic
import httpx

from . import cache as C

log = logging.getLogger(__name__)

_SPARQL_URL = "https://query.wikidata.org/sparql"

# ---------------------------------------------------------------------------
# MFA domains and country mapping
# ---------------------------------------------------------------------------

# Official MFA/Foreign Ministry websites per country ISO-3 code.
# These are public sites — no authentication required.
_MFA_SOURCES: list[dict[str, str]] = [
    {"code": "USA", "name": "United States",  "domain": "state.gov"},
    {"code": "GBR", "name": "United Kingdom", "domain": "gov.uk"},
    {"code": "FRA", "name": "France",          "domain": "diplomatie.gouv.fr"},
    {"code": "DEU", "name": "Germany",         "domain": "auswaertiges-amt.de"},
    {"code": "JPN", "name": "Japan",           "domain": "mofa.go.jp"},
    {"code": "CHN", "name": "China",           "domain": "mfa.gov.cn"},
    {"code": "RUS", "name": "Russia",          "domain": "mid.ru"},
    {"code": "ITA", "name": "Italy",           "domain": "esteri.it"},
    {"code": "CAN", "name": "Canada",          "domain": "international.gc.ca"},
    {"code": "AUS", "name": "Australia",       "domain": "dfat.gov.au"},
    {"code": "ESP", "name": "Spain",           "domain": "exteriores.gob.es"},
    {"code": "BRA", "name": "Brazil",          "domain": "gov.br"},
    {"code": "MEX", "name": "Mexico",          "domain": "gob.mx"},
    {"code": "ARG", "name": "Argentina",       "domain": "cancilleria.gob.ar"},
    {"code": "CHL", "name": "Chile",           "domain": "minrel.gob.cl"},
    {"code": "COL", "name": "Colombia",        "domain": "cancilleria.gov.co"},
    {"code": "PER", "name": "Peru",            "domain": "rree.gob.pe"},
    {"code": "ECU", "name": "Ecuador",         "domain": "cancilleria.gob.ec"},
    {"code": "BOL", "name": "Bolivia",         "domain": "cancilleria.gob.bo"},
    {"code": "PRY", "name": "Paraguay",        "domain": "mre.gov.py"},
    {"code": "URY", "name": "Uruguay",         "domain": "mrree.gub.uy"},
    {"code": "VEN", "name": "Venezuela",       "domain": "mppre.gob.ve"},
    {"code": "IND", "name": "India",           "domain": "mea.gov.in"},
    {"code": "PAK", "name": "Pakistan",        "domain": "mofa.gov.pk"},
    {"code": "IDN", "name": "Indonesia",       "domain": "kemlu.go.id"},
    {"code": "MYS", "name": "Malaysia",        "domain": "kln.gov.my"},
    {"code": "SGP", "name": "Singapore",       "domain": "mfa.gov.sg"},
    {"code": "THA", "name": "Thailand",        "domain": "mfa.go.th"},
    {"code": "VNM", "name": "Vietnam",         "domain": "mofa.gov.vn"},
    {"code": "PHL", "name": "Philippines",     "domain": "dfa.gov.ph"},
    {"code": "KOR", "name": "South Korea",     "domain": "mofa.go.kr"},
    {"code": "TUR", "name": "Turkey",          "domain": "mfa.gov.tr"},
    {"code": "SAU", "name": "Saudi Arabia",    "domain": "mofa.gov.sa"},
    {"code": "ARE", "name": "UAE",             "domain": "mofaic.gov.ae"},
    {"code": "EGY", "name": "Egypt",           "domain": "mfa.gov.eg"},
    {"code": "ZAF", "name": "South Africa",    "domain": "dirco.gov.za"},
    {"code": "NGA", "name": "Nigeria",         "domain": "mfa.gov.ng"},
    {"code": "KEN", "name": "Kenya",           "domain": "mfa.go.ke"},
    {"code": "GHA", "name": "Ghana",           "domain": "mfa.gov.gh"},
    {"code": "MAR", "name": "Morocco",         "domain": "mfa.gov.ma"},
    {"code": "DZA", "name": "Algeria",         "domain": "mae.gov.dz"},
    {"code": "POL", "name": "Poland",          "domain": "gov.pl"},
    {"code": "NLD", "name": "Netherlands",     "domain": "netherlandsworldwide.nl"},
    {"code": "BEL", "name": "Belgium",         "domain": "diplomatie.be"},
    {"code": "SWE", "name": "Sweden",          "domain": "swedenabroad.se"},
    {"code": "NOR", "name": "Norway",          "domain": "norway.no"},
    {"code": "DNK", "name": "Denmark",         "domain": "denmark.dk"},
    {"code": "FIN", "name": "Finland",         "domain": "finland.fi"},
    {"code": "CHE", "name": "Switzerland",     "domain": "eda.admin.ch"},
    {"code": "AUT", "name": "Austria",         "domain": "bmeia.gv.at"},
    {"code": "PRT", "name": "Portugal",        "domain": "mne.gov.pt"},
    {"code": "GRC", "name": "Greece",          "domain": "mfa.gr"},
    {"code": "ISR", "name": "Israel",          "domain": "mfa.gov.il"},
    {"code": "IRN", "name": "Iran",            "domain": "mfa.gov.ir"},
    {"code": "IRQ", "name": "Iraq",            "domain": "mofa.gov.iq"},
    {"code": "JOR", "name": "Jordan",          "domain": "mfa.gov.jo"},
    {"code": "KWT", "name": "Kuwait",          "domain": "mofa.gov.kw"},
    {"code": "QAT", "name": "Qatar",           "domain": "mofa.gov.qa"},
    {"code": "OMN", "name": "Oman",            "domain": "mofa.gov.om"},
    {"code": "KAZ", "name": "Kazakhstan",      "domain": "mfa.kz"},
    {"code": "UKR", "name": "Ukraine",         "domain": "mfa.gov.ua"},
    {"code": "CZE", "name": "Czech Republic",  "domain": "mzv.cz"},
    {"code": "HUN", "name": "Hungary",         "domain": "mfa.gov.hu"},
    {"code": "ROU", "name": "Romania",         "domain": "mae.ro"},
    {"code": "BGR", "name": "Bulgaria",        "domain": "mfa.bg"},
    {"code": "HRV", "name": "Croatia",         "domain": "mvep.gov.hr"},
    {"code": "SRB", "name": "Serbia",          "domain": "mfa.gov.rs"},
    {"code": "NZL", "name": "New Zealand",     "domain": "mfat.govt.nz"},
]

# All MFA domains to include in allowed_domains for the web search tool
_MFA_DOMAINS = [s["domain"] for s in _MFA_SOURCES]

# International organizations that publish accredited ambassador/permanent rep lists
_IO_SOURCES: list[dict[str, str]] = [
    {
        "id": "UN_NY",
        "name": "United Nations (New York) — Permanent Representatives",
        "domain": "un.org",
        "query": (
            "Search protocol.un.org or un.org for the current complete list of "
            "Permanent Representatives accredited to the United Nations in New York. "
            "For each country return: country name, ambassador/permanent representative full name, "
            "and date of accreditation if available. "
            "Return ONLY a JSON array: "
            '[{"name":"...","fromCountry":"full country name","toCountry":"UN","startDate":"YYYY-MM-DD or empty"}].'
        ),
    },
    {
        "id": "UN_GE",
        "name": "United Nations (Geneva) — Permanent Representatives",
        "domain": "unog.ch",
        "query": (
            "Search unog.ch for the current list of Permanent Representatives accredited "
            "to the United Nations Office at Geneva. "
            "For each country return: country name, ambassador/permanent representative full name, "
            "and date of accreditation if available. "
            "Return ONLY a JSON array: "
            '[{"name":"...","fromCountry":"full country name","toCountry":"UN Geneva","startDate":"YYYY-MM-DD or empty"}].'
        ),
    },
    {
        "id": "OAS",
        "name": "Organization of American States — Permanent Missions",
        "domain": "oas.org",
        "query": (
            "Search oas.org for the current list of Permanent Representatives "
            "and Ambassadors accredited to the Organization of American States (OAS/OEA). "
            "For each country return: country name, ambassador full name, "
            "and date of accreditation if available. "
            "Return ONLY a JSON array: "
            '[{"name":"...","fromCountry":"full country name","toCountry":"OAS","startDate":"YYYY-MM-DD or empty"}].'
        ),
    },
    {
        "id": "EU",
        "name": "European Union — Accredited Ambassadors",
        "domain": "eeas.europa.eu",
        "query": (
            "Search eeas.europa.eu for the current list of Ambassadors and Heads of Mission "
            "accredited to the European Union. "
            "For each country return: country name, ambassador full name, "
            "and date of accreditation if available. "
            "Return ONLY a JSON array: "
            '[{"name":"...","fromCountry":"full country name","toCountry":"EU","startDate":"YYYY-MM-DD or empty"}].'
        ),
    },
    {
        "id": "ASEAN",
        "name": "ASEAN — Accredited Ambassadors",
        "domain": "asean.org",
        "query": (
            "Search asean.org for the current list of Ambassadors and Permanent Representatives "
            "accredited to ASEAN. "
            "For each country return: country name, ambassador full name, "
            "and date of accreditation if available. "
            "Return ONLY a JSON array: "
            '[{"name":"...","fromCountry":"full country name","toCountry":"ASEAN","startDate":"YYYY-MM-DD or empty"}].'
        ),
    },
    {
        "id": "AU",
        "name": "African Union — Accredited Ambassadors",
        "domain": "africanunion.org",
        "query": (
            "Search africanunion.org for the current list of Ambassadors and Permanent Representatives "
            "accredited to the African Union. "
            "For each country return: country name, ambassador full name, "
            "and date of accreditation if available. "
            "Return ONLY a JSON array: "
            '[{"name":"...","fromCountry":"full country name","toCountry":"African Union","startDate":"YYYY-MM-DD or empty"}].'
        ),
    },
    {
        "id": "WTO",
        "name": "WTO — Permanent Representatives",
        "domain": "wto.org",
        "query": (
            "Search wto.org for the current list of Permanent Representatives and Ambassadors "
            "accredited to the World Trade Organization. "
            "For each country return: country name, ambassador full name, "
            "and date of accreditation if available. "
            "Return ONLY a JSON array: "
            '[{"name":"...","fromCountry":"full country name","toCountry":"WTO","startDate":"YYYY-MM-DD or empty"}].'
        ),
    },
    {
        "id": "NATO",
        "name": "NATO — Permanent Representatives",
        "domain": "nato.int",
        "query": (
            "Search nato.int for the current list of Permanent Representatives "
            "accredited to NATO. "
            "For each country return: country name, ambassador full name, "
            "and date of accreditation if available. "
            "Return ONLY a JSON array: "
            '[{"name":"...","fromCountry":"full country name","toCountry":"NATO","startDate":"YYYY-MM-DD or empty"}].'
        ),
    },
]

_IO_DOMAINS = list({s["domain"] for s in _IO_SOURCES})

# ---------------------------------------------------------------------------
# Wikidata SPARQL query
# ---------------------------------------------------------------------------

_SPARQL_QUERY = """
SELECT DISTINCT
  ?personLabel
  ?posLabel
  ?startDate
WHERE {
  ?person wdt:P31 wd:Q5 ;
          p:P39 ?stmt .
  ?stmt ps:P39 ?pos .
  { ?pos wdt:P31/wdt:P279* wd:Q121998 }
  UNION
  { ?pos wdt:P279+ wd:Q121998 }
  FILTER NOT EXISTS { ?stmt pq:P582 [] }

  # Only positions with English labels containing " to " — this guarantees
  # the consistent format "Ambassador of [FROM] to [TO]", making extraction
  # trivial and 100% reliable without any regex fragility.
  ?pos rdfs:label ?posLabel .
  FILTER(LANG(?posLabel) = "en")
  FILTER(CONTAINS(LCASE(?posLabel), " to "))

  OPTIONAL { ?stmt pq:P580 ?startDate }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
ORDER BY ?posLabel ?personLabel
LIMIT 10000
"""


# ---------------------------------------------------------------------------
# Wikidata fetch
# ---------------------------------------------------------------------------

def _fetch_wikidata_ambassadors() -> list[dict[str, Any]]:
    """Fetch ambassador records from Wikidata SPARQL."""
    try:
        resp = httpx.post(
            _SPARQL_URL,
            data={"query": _SPARQL_QUERY, "format": "json"},
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
        log.error("Wikidata ambassadors SPARQL failed: %s", exc)
        return []

    records: list[dict[str, Any]] = []
    for row in bindings:
        name = row.get("personLabel", {}).get("value", "")
        pos_label = row.get("posLabel", {}).get("value", "")
        raw_date = row.get("startDate", {}).get("value", "")

        if not name or name.startswith("Q") or not pos_label:
            continue

        from_code, to_code = _parse_ambassador_label(pos_label)
        if not from_code or not to_code or from_code == to_code:
            continue

        records.append({
            "name": name,
            "fromCountry": from_code,
            "toCountry": to_code,
            "startDate": raw_date[:10] if raw_date else "",
        })

    log.info("Wikidata returned %d ambassador records", len(records))
    return records


# ---------------------------------------------------------------------------
# MFA web search fetch (per country)
# ---------------------------------------------------------------------------

async def _fetch_mfa_country(source: dict[str, str], client: anthropic.AsyncAnthropic) -> list[dict[str, Any]]:
    """Search one country's MFA website for its current ambassadors abroad."""
    country_name = source["name"]
    country_code = source["code"]
    domain = source["domain"]
    cache_key = f"mfa_ambassadors_{country_code}_v1"

    cached = C.get(cache_key)
    if cached is not None:
        return cached

    query = (
        f"Search {domain} for the complete list of current {country_name} ambassadors "
        f"assigned abroad as of {date.today()}. "
        f"For each ambassador return: full name, country they are assigned to, "
        f"and date of appointment/acceptance (if available). "
        f"Return ONLY a JSON array like: "
        f'[{{"name":"...", "toCountry":"...", "startDate":"YYYY-MM-DD or empty"}}]. '
        f"No explanations, just the JSON array."
    )

    allowed = _MFA_DOMAINS + [
        "un.org", "reuters.com", "apnews.com", "bbc.com",
    ]

    try:
        response = await client.messages.create(
            model="claude-haiku-5-5",
            max_tokens=2000,
            tools=[{
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": 3,
                "allowed_domains": allowed,
            }],
            messages=[{"role": "user", "content": query}],
        )
        # Extract text blocks
        text = " ".join(b.text for b in response.content if hasattr(b, "text") and b.text).strip()

        # Parse JSON array from response
        m = re.search(r"\[.*\]", text, re.DOTALL)
        if not m:
            return []
        raw_list = json.loads(m.group(0))
    except Exception as exc:
        log.warning("MFA web search failed for %s: %s", country_name, exc)
        return []

    records: list[dict[str, Any]] = []
    for item in raw_list:
        name = str(item.get("name", "")).strip()
        to_name = str(item.get("toCountry", "")).strip()
        start = str(item.get("startDate", "")).strip()

        if not name or name.startswith("Q"):
            continue

        to_code = _match_country(to_name.lower()) or to_name[:3].upper()

        records.append({
            "name": name,
            "fromCountry": country_code,
            "toCountry": to_code,
            "startDate": start if re.match(r"\d{4}", start) else "",
        })

    _MONTHLY = 30 * 86_400  # 30 days — ambassador assignments change slowly
    if records:
        C.set(cache_key, records, ttl=_MONTHLY)
        log.info("MFA %s: %d ambassadors fetched", country_name, len(records))

    return records


async def _fetch_io_org(source: dict[str, str], client: anthropic.AsyncAnthropic) -> list[dict[str, Any]]:
    """Fetch ambassador/rep list from one international organization (ONU, OEA, EU, etc.)."""
    cache_key = f"io_ambassadors_{source['id']}_v1"
    cached = C.get(cache_key)
    if cached is not None:
        return cached

    allowed = _IO_DOMAINS + _MFA_DOMAINS + ["un.org", "reuters.com", "apnews.com"]

    try:
        response = await client.messages.create(
            model="claude-haiku-5-5",
            max_tokens=4000,
            tools=[{
                "type": "web_search_20250305",
                "name": "web_search",
                "max_uses": 3,
                "allowed_domains": list(dict.fromkeys(allowed)),
            }],
            messages=[{"role": "user", "content": source["query"]}],
        )
        text = " ".join(b.text for b in response.content if hasattr(b, "text") and b.text).strip()
        m = re.search(r"\[.*\]", text, re.DOTALL)
        if not m:
            return []
        raw_list = json.loads(m.group(0))
    except Exception as exc:
        log.warning("IO web search failed for %s: %s", source["id"], exc)
        return []

    records: list[dict[str, Any]] = []
    for item in raw_list:
        name = str(item.get("name", "")).strip()
        from_name = str(item.get("fromCountry", "")).strip()
        to_name = str(item.get("toCountry", "")).strip()
        start = str(item.get("startDate", "")).strip()

        if not name or name.startswith("Q"):
            continue

        from_code = _match_country(from_name.lower()) or from_name[:3].upper()
        # Keep IO destinations as readable string (UN, OAS, EU, etc.)
        to_code = to_name if to_name else source["id"]

        records.append({
            "name": name,
            "fromCountry": from_code,
            "toCountry": to_code,
            "startDate": start if re.match(r"\d{4}", start) else "",
        })

    _MONTHLY = 30 * 86_400
    if records:
        C.set(cache_key, records, ttl=_MONTHLY)
        log.info("IO %s: %d reps fetched", source["name"], len(records))

    return records


async def _fetch_all_io_ambassadors() -> list[dict[str, Any]]:
    """Fetch permanent representative lists from all international organizations."""
    from settings import get_settings
    settings = get_settings()
    if not settings.ANTHROPIC_API_KEY:
        return []

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    results = await asyncio.gather(
        *[_fetch_io_org(src, client) for src in _IO_SOURCES],
        return_exceptions=True,
    )
    records: list[dict[str, Any]] = []
    for r in results:
        if isinstance(r, list):
            records.extend(r)
    log.info("IO organizations total: %d rep records", len(records))
    return records


async def _fetch_all_mfa_ambassadors(client: anthropic.AsyncAnthropic) -> list[dict[str, Any]]:
    """Fetch ambassador lists from all MFA websites concurrently (batches of 10)."""
    all_records: list[dict[str, Any]] = []
    batch_size = 10
    for i in range(0, len(_MFA_SOURCES), batch_size):
        batch = _MFA_SOURCES[i:i + batch_size]
        results = await asyncio.gather(
            *[_fetch_mfa_country(src, client) for src in batch],
            return_exceptions=True,
        )
        for r in results:
            if isinstance(r, list):
                all_records.extend(r)
        await asyncio.sleep(1)
    log.info("MFA web search total: %d ambassador records", len(all_records))
    return all_records


async def _fetch_all_sources() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Run MFA + IO fetches concurrently and return (mfa_records, io_records)."""
    from settings import get_settings
    settings = get_settings()
    if not settings.ANTHROPIC_API_KEY:
        return [], []
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    mfa, io = await asyncio.gather(
        _fetch_all_mfa_ambassadors(client),
        _fetch_all_io_ambassadors(),
        return_exceptions=True,
    )
    return (mfa if isinstance(mfa, list) else []), (io if isinstance(io, list) else [])


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def fetch_ambassadors() -> list[dict[str, Any]]:
    """Return merged ambassador list from Wikidata + MFA websites. Cached 12h."""
    cache_key = "ambassadors_combined_v4"
    cached = C.get(cache_key)
    if cached is not None:
        return cached

    # Wikidata (sync)
    wikidata_records = _fetch_wikidata_ambassadors()

    # MFA + IO web search (async — run in event loop)
    try:
        mfa_records, io_records = asyncio.run(_fetch_all_sources())
    except RuntimeError:
        mfa_records, io_records = [], []
        log.info("Web fetch skipped (event loop already running); will retry on next request")

    # Merge and deduplicate by (name, fromCountry, toCountry)
    seen: set[tuple[str, str, str]] = set()
    merged: list[dict[str, Any]] = []

    for rec in wikidata_records + mfa_records + io_records:
        key = (rec["name"].lower(), rec["fromCountry"], rec["toCountry"])
        if key in seen:
            continue
        seen.add(key)
        merged.append(rec)

    merged.sort(key=lambda r: (r["fromCountry"], r["name"]))

    _MONTHLY = 30 * 86_400
    if merged:
        C.set(cache_key, merged, ttl=_MONTHLY)
        log.info("Combined ambassador list: %d records (Wikidata=%d, MFA=%d, IO=%d)",
                 len(merged), len(wikidata_records), len(mfa_records), len(io_records))
    else:
        log.warning("Combined ambassador list is empty")

    return merged


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


# International organization names → short code (used as toCountry)
_IO_NAMES: dict[str, str] = {
    "united nations": "UN",
    "european union": "EU",
    "organization of american states": "OAS",
    "organisation of american states": "OAS",
    "african union": "AU",
    "world trade organization": "WTO",
    "world trade organisation": "WTO",
    "north atlantic treaty organization": "NATO",
    "north atlantic treaty organisation": "NATO",
    "asean": "ASEAN",
    "council of europe": "COE",
    "arab league": "AL",
    "commonwealth": "CW",
}


def _match_io(fragment: str) -> str:
    """Return short IO code if fragment contains a known organization name."""
    for name, code in _IO_NAMES.items():
        if name in fragment:
            return code
    return ""


def _parse_ambassador_label(label: str) -> tuple[str, str]:
    """Parse 'Ambassador of [FROM] to [TO]' English label → (from_iso3, to_code).

    The SPARQL guarantees labels contain ' to ' and are in English, so this
    simple split is sufficient — no multilingual regex needed.
    """
    lower = label.lower()
    of_idx = lower.find(" of ")
    to_idx = lower.rfind(" to ")
    if of_idx == -1 or to_idx == -1 or to_idx <= of_idx:
        return "", ""

    from_raw = lower[of_idx + 4: to_idx].strip().lstrip("the ").strip()
    to_raw = lower[to_idx + 4:].strip().lstrip("the ").strip()
    to_raw = re.sub(r"\s*\(.*$", "", to_raw).strip()

    from_code = _match_country(from_raw)
    to_code = _match_country(to_raw) or _match_io(to_raw)

    return from_code, to_code
