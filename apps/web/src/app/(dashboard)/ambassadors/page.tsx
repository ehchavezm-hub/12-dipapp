"use client"

import { useEffect, useState, useMemo } from "react"

interface Ambassador {
  name: string
  fromCountry: string
  toCountry: string
  startDate: string
}

const COUNTRY_NAMES: Record<string, string> = {
  ABW:"Aruba",AFG:"Afganistán",AGO:"Angola",ALB:"Albania",AND:"Andorra",ARE:"Emiratos Árabes",ARG:"Argentina",ARM:"Armenia",ATG:"Antigua y Barbuda",AUS:"Australia",AUT:"Austria",AZE:"Azerbaiyán",BDI:"Burundi",BEL:"Bélgica",BEN:"Benín",BFA:"Burkina Faso",BGD:"Bangladesh",BGR:"Bulgaria",BHR:"Baréin",BHS:"Bahamas",BIH:"Bosnia-Herzegovina",BLR:"Bielorrusia",BLZ:"Belice",BOL:"Bolivia",BRA:"Brasil",BRB:"Barbados",BRN:"Brunéi",BTN:"Bután",BWA:"Botsuana",CAF:"R. Centroafricana",CAN:"Canadá",CHE:"Suiza",CHL:"Chile",CHN:"China",CIV:"Costa de Marfil",CMR:"Camerún",COD:"R.D. del Congo",COG:"Congo",COL:"Colombia",COM:"Comoras",CPV:"Cabo Verde",CRI:"Costa Rica",CUB:"Cuba",CYP:"Chipre",CZE:"Chequia",DEU:"Alemania",DJI:"Yibuti",DMA:"Dominica",DNK:"Dinamarca",DOM:"Rep. Dominicana",DZA:"Argelia",ECU:"Ecuador",EGY:"Egipto",ERI:"Eritrea",ESP:"España",EST:"Estonia",ETH:"Etiopía",FIN:"Finlandia",FJI:"Fiyi",FRA:"Francia",FSM:"Micronesia",GAB:"Gabón",GBR:"Reino Unido",GEO:"Georgia",GHA:"Ghana",GIN:"Guinea",GMB:"Gambia",GNB:"Guinea-Bisáu",GNQ:"Guinea Ecuatorial",GRC:"Grecia",GRD:"Granada",GTM:"Guatemala",GUY:"Guyana",HND:"Honduras",HRV:"Croacia",HTI:"Haití",HUN:"Hungría",IDN:"Indonesia",IND:"India",IRL:"Irlanda",IRN:"Irán",IRQ:"Irak",ISL:"Islandia",ISR:"Israel",ITA:"Italia",JAM:"Jamaica",JOR:"Jordania",JPN:"Japón",KAZ:"Kazajistán",KEN:"Kenia",KGZ:"Kirguistán",KHM:"Camboya",KIR:"Kiribati",KNA:"San Cristóbal y Nieves",KOR:"Corea del Sur",KWT:"Kuwait",LAO:"Laos",LBN:"Líbano",LBR:"Liberia",LBY:"Libia",LCA:"Santa Lucía",LIE:"Liechtenstein",LKA:"Sri Lanka",LSO:"Lesoto",LTU:"Lituania",LUX:"Luxemburgo",LVA:"Letonia",MAR:"Marruecos",MCO:"Mónaco",MDA:"Moldavia",MDG:"Madagascar",MDV:"Maldivas",MEX:"México",MHL:"Islas Marshall",MKD:"Macedonia del N.",MLI:"Malí",MLT:"Malta",MMR:"Myanmar",MNE:"Montenegro",MNG:"Mongolia",MOZ:"Mozambique",MRT:"Mauritania",MUS:"Mauricio",MWI:"Malaui",MYS:"Malasia",NAM:"Namibia",NER:"Níger",NGA:"Nigeria",NIC:"Nicaragua",NLD:"Países Bajos",NOR:"Noruega",NPL:"Nepal",NRU:"Nauru",NZL:"Nueva Zelanda",OMN:"Omán",PAK:"Pakistán",PAN:"Panamá",PER:"Perú",PHL:"Filipinas",PLW:"Palaos",PNG:"Papúa N. Guinea",POL:"Polonia",PRK:"Corea del Norte",PRT:"Portugal",PRY:"Paraguay",PSE:"Palestina",QAT:"Catar",ROU:"Rumanía",RUS:"Rusia",RWA:"Ruanda",SAU:"Arabia Saudita",SDN:"Sudán",SEN:"Senegal",SGP:"Singapur",SLB:"Islas Salomón",SLE:"Sierra Leona",SLV:"El Salvador",SMR:"San Marino",SOM:"Somalia",SRB:"Serbia",SSD:"Sudán del Sur",STP:"Santo Tomé y Príncipe",SUR:"Surinam",SVK:"Eslovaquia",SVN:"Eslovenia",SWE:"Suecia",SWZ:"Esuatini",SYC:"Seychelles",SYR:"Siria",TCD:"Chad",TGO:"Togo",THA:"Tailandia",TJK:"Tayikistán",TKM:"Turkmenistán",TLS:"Timor-Leste",TON:"Tonga",TTO:"Trinidad y Tobago",TUN:"Túnez",TUR:"Turquía",TUV:"Tuvalu",TZA:"Tanzania",UGA:"Uganda",UKR:"Ucrania",URY:"Uruguay",USA:"Estados Unidos",UZB:"Uzbekistán",VAT:"Vaticano",VCT:"San Vicente y las Granadinas",VEN:"Venezuela",VNM:"Vietnam",VUT:"Vanuatu",WSM:"Samoa",YEM:"Yemen",ZAF:"Sudáfrica",ZMB:"Zambia",ZWE:"Zimbabue",
}

function countryName(code: string): string {
  return COUNTRY_NAMES[code] || code
}

function formatDate(iso: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("es-PE", { year: "numeric", month: "short", day: "numeric" })
  } catch {
    return iso
  }
}

export default function AmbassadorsPage() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")
  const [sortKey, setSortKey] = useState<keyof Ambassador>("fromCountry")
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  async function load(refresh = false) {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/proxy/ambassadors${refresh ? "?refresh=true" : ""}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setAmbassadors(data.ambassadors ?? [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const fromCountries = useMemo(() => {
    const s = new Set(ambassadors.map(a => a.fromCountry).filter(Boolean))
    return Array.from(s).sort()
  }, [ambassadors])

  const toCountries = useMemo(() => {
    const s = new Set(ambassadors.map(a => a.toCountry).filter(Boolean))
    return Array.from(s).sort()
  }, [ambassadors])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return ambassadors
      .filter(a => {
        if (filterFrom && a.fromCountry !== filterFrom) return false
        if (filterTo && a.toCountry !== filterTo) return false
        if (q && !a.name.toLowerCase().includes(q) &&
            !countryName(a.fromCountry).toLowerCase().includes(q) &&
            !countryName(a.toCountry).toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        const av = sortKey === "fromCountry" ? countryName(a.fromCountry)
          : sortKey === "toCountry" ? countryName(a.toCountry)
          : (a[sortKey] ?? "")
        const bv = sortKey === "fromCountry" ? countryName(b.fromCountry)
          : sortKey === "toCountry" ? countryName(b.toCountry)
          : (b[sortKey] ?? "")
        return sortDir * String(av).localeCompare(String(bv), "es")
      })
  }, [ambassadors, search, filterFrom, filterTo, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(key: keyof Ambassador) {
    if (sortKey === key) setSortDir(d => d === 1 ? -1 : 1)
    else { setSortKey(key); setSortDir(1) }
    setPage(1)
  }

  function SortIcon({ col }: { col: keyof Ambassador }) {
    if (sortKey !== col) return <span style={{ color: "#CCC" }}>⇅</span>
    return <span style={{ color: "#FF6600" }}>{sortDir === 1 ? "↑" : "↓"}</span>
  }

  const th: React.CSSProperties = {
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700,
    color: "#6D6E71", textTransform: "uppercase", letterSpacing: "0.06em",
    borderBottom: "2px solid #E0E0E0", cursor: "pointer", whiteSpace: "nowrap",
    background: "#F7F8FA", userSelect: "none",
  }
  const td: React.CSSProperties = {
    padding: "9px 14px", fontSize: 13, color: "#1A1A1A",
    borderBottom: "1px solid #F0F0F0", verticalAlign: "middle",
  }
  const selStyle: React.CSSProperties = {
    background: "#fff", border: "1px solid #DADCE0", borderRadius: 4,
    padding: "6px 10px", fontSize: 13, color: "#1A1A1A",
    fontFamily: "var(--font-urbanist)", outline: "none", cursor: "pointer",
  }

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh", background: "#fff" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A", fontFamily: "var(--font-urbanist)", margin: 0 }}>
          🌍 Embajadores en funciones
        </h1>
        {!loading && (
          <span style={{ fontSize: 12, background: "#FF6600", color: "#fff", borderRadius: 10, padding: "2px 10px", fontWeight: 600 }}>
            {filtered.length.toLocaleString()} / {ambassadors.length.toLocaleString()}
          </span>
        )}
        <button
          onClick={() => { load(true); setPage(1) }}
          disabled={refreshing || loading}
          style={{
            marginLeft: "auto", background: "#fff", border: "1px solid #DADCE0",
            borderRadius: 4, padding: "7px 16px", fontSize: 13, cursor: "pointer",
            fontFamily: "var(--font-urbanist)", color: refreshing ? "#999" : "#1A1A1A",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          {refreshing ? "⟳ Actualizando…" : "⟳ Actualizar datos"}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="🔍 Buscar embajador o país…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ ...selStyle, width: 260, padding: "7px 12px" }}
        />
        <select value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1) }} style={selStyle}>
          <option value="">Todos los países origen</option>
          {fromCountries.map(c => (
            <option key={c} value={c}>{countryName(c)} ({c})</option>
          ))}
        </select>
        <select value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1) }} style={selStyle}>
          <option value="">Todos los países destino</option>
          {toCountries.map(c => (
            <option key={c} value={c}>{countryName(c)} ({c})</option>
          ))}
        </select>
        {(search || filterFrom || filterTo) && (
          <button
            onClick={() => { setSearch(""); setFilterFrom(""); setFilterTo(""); setPage(1) }}
            style={{ ...selStyle, color: "#FF6600", border: "1px solid #FF6600" }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#6D6E71", fontSize: 14 }}>
          Cargando datos de Wikidata… (puede tardar hasta 30 s la primera vez)
        </div>
      )}
      {error && (
        <div style={{ padding: 16, background: "#FFF3F3", border: "1px solid #FF5252", borderRadius: 6, color: "#B71C1C", fontSize: 13 }}>
          Error al cargar: {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <div style={{ overflowX: "auto", border: "1px solid #E0E0E0", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-urbanist)" }}>
              <thead>
                <tr>
                  <th style={th} onClick={() => toggleSort("name")}>
                    Embajador <SortIcon col="name" />
                  </th>
                  <th style={th} onClick={() => toggleSort("fromCountry")}>
                    País origen <SortIcon col="fromCountry" />
                  </th>
                  <th style={th} onClick={() => toggleSort("toCountry")}>
                    Asignado a <SortIcon col="toCountry" />
                  </th>
                  <th style={th} onClick={() => toggleSort("startDate")}>
                    Fecha aceptación <SortIcon col="startDate" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ ...td, textAlign: "center", color: "#9E9E9E", padding: 32 }}>
                      No se encontraron resultados
                    </td>
                  </tr>
                )}
                {pageData.map((a, i) => (
                  <tr
                    key={i}
                    style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FFF3EB")}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FAFAFA")}
                  >
                    <td style={{ ...td, fontWeight: 500 }}>{a.name}</td>
                    <td style={td}>
                      {a.fromCountry ? (
                        <span>
                          <span style={{ fontSize: 11, color: "#9E9E9E", marginRight: 4 }}>[{a.fromCountry}]</span>
                          {countryName(a.fromCountry)}
                        </span>
                      ) : <span style={{ color: "#CCC" }}>—</span>}
                    </td>
                    <td style={td}>
                      {a.toCountry ? (
                        <span>
                          <span style={{ fontSize: 11, color: "#9E9E9E", marginRight: 4 }}>[{a.toCountry}]</span>
                          {countryName(a.toCountry)}
                        </span>
                      ) : <span style={{ color: "#CCC" }}>—</span>}
                    </td>
                    <td style={{ ...td, color: a.startDate ? "#1A1A1A" : "#CCC" }}>
                      {formatDate(a.startDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontFamily: "var(--font-urbanist)" }}>
            <span style={{ fontSize: 13, color: "#6D6E71" }}>
              Pág. {page} / {totalPages} · {filtered.length.toLocaleString()} resultados
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                style={{ ...selStyle, padding: "5px 10px", opacity: page === 1 ? 0.4 : 1 }}
              >«</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ ...selStyle, padding: "5px 10px", opacity: page === 1 ? 0.4 : 1 }}
              >‹</button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ ...selStyle, padding: "5px 10px", opacity: page === totalPages ? 0.4 : 1 }}
              >›</button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                style={{ ...selStyle, padding: "5px 10px", opacity: page === totalPages ? 0.4 : 1 }}
              >»</button>
            </div>
          </div>

          {/* Source note */}
          <p style={{ fontSize: 11, color: "#BBBCBE", marginTop: 16 }}>
            Fuente: Wikidata + Cancillerías oficiales (sitios públicos). Actualización automática mensual. Última carga: {new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })}.
          </p>
        </>
      )}
    </div>
  )
}
