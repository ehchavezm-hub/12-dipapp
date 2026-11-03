# 12-DIPAPP — Sistema de Gestión de Relaciones Diplomáticas
## Especificación de Diseño

**Fecha:** 2026-11-03  
**Repositorio:** https://github.com/ehchavezm-hub/12-DIPAPP  
**Estado:** Aprobado — listo para implementación

---

## 1. Objetivo General

Sistema web **stateless** para gestión, mapeo de redes de influencia geopolítica, análisis de perfiles diplomáticos y generación de estrategias de contacto bilateral/multilateral asistidas por IA en tiempo real.

No existe persistencia en base de datos relacional propia. Todo procesamiento ocurre in-memory en el backend o en cliente (LocalStorage/SessionStorage). Los datos sensibles nunca se almacenan en servidor.

---

## 2. Arquitectura General

### Topología

```
Browser (Client)
  Zustand (in-memory state) + LocalStorage (session cache)
        │ HTTPS
Vercel — Next.js 14 App Router
  • GitHub OAuth exclusivo (NextAuth.js v5)
  • JWT claim → rol RBAC en cookie HttpOnly/Secure/SameSite=Strict
  • Server Components para SSR inicial del grafo
  • Route Handlers: /api/auth/[...nextauth]
        │ HTTPS (JWT en Authorization header)
Railway — FastAPI 0.111 / Python 3.11
  • Validación JWT GitHub asimétrica (sin DB)
  • Proxy seguro: ANTHROPIC_API_KEY / OPENAI_API_KEY
  • Pipeline PDF: pdfplumber → chunking → contexto LLM
  • Motor de Scoring geopolítico + orquestación LLM
  • Rate limiting: Upstash Redis (60 req/min/token)
```

**Justificación Railway sobre Vercel Python:** Las llamadas LLM con Chain-of-Thought + procesamiento de PDFs pesados requieren timeouts mayores a 60s. Railway ejecuta FastAPI como container sin límite de timeout, eliminando el principal cuello de botella de Vercel Python runtime.

### Estructura del Repositorio (Monorepo — Turborepo + pnpm)

```
12-DIPAPP/
├── apps/
│   ├── web/                          # Next.js (deploy: Vercel)
│   │   ├── app/
│   │   │   ├── (auth)/               # /login, /callback
│   │   │   ├── (dashboard)/
│   │   │   │   ├── graph/            # canvas principal
│   │   │   │   ├── analysis/         # stepper configuración caso
│   │   │   │   └── results/          # 3 escenarios A/B/C
│   │   │   └── api/
│   │   │       └── auth/[...nextauth]/
│   │   ├── components/
│   │   │   ├── graph/                # Cytoscape canvas + controles
│   │   │   ├── analysis/             # stepper + formulario Zod
│   │   │   └── ui/                   # Shadcn wrappers
│   │   └── lib/
│   │       ├── hooks/
│   │       ├── services/             # llamadas HTTP al backend
│   │       └── store/                # Zustand stores
│   └── api/                          # FastAPI (deploy: Railway)
│       ├── routers/
│       │   ├── analysis.py           # POST /analysis
│       │   ├── graph.py              # GET /graph/data
│       │   └── documents.py          # POST /documents/ingest
│       ├── services/
│       │   ├── scoring.py            # algoritmo geopolítico
│       │   ├── llm_orchestrator.py   # Instructor + Anthropic SDK
│       │   └── pdf_pipeline.py       # pdfplumber + chunking
│       ├── schemas/                  # Pydantic v2 DTOs
│       └── middleware/
│           ├── auth.py               # validación JWT GitHub
│           └── rate_limit.py         # Upstash Redis
└── packages/
    └── types/                        # tipos TypeScript compartidos
```

---

## 3. Autenticación y RBAC

### Proveedor

**GitHub OAuth exclusivo** — sin Supabase Auth ni Auth0. La gestión de identidad se delega completamente a GitHub.

### Asignación de Roles

| Rol | Criterio GitHub | Permisos |
|-----|----------------|----------|
| `superadmin` | Team `dipapp-admins` o env `SUPERADMIN_GITHUB_LOGINS` | Gestión de API keys, config global in-memory, asignación de claims |
| `editor` | Team `dipapp-editors` | Ajuste de pesos scoring, creación/exportación de informes, simulación de escenarios |
| `viewer` | Cualquier miembro autenticado | Lectura de mapas, exportación PNG/SVG del grafo |

### Flujo JWT

1. Usuario → GitHub OAuth → NextAuth.js callback
2. NextAuth consulta GitHub API (`/user/orgs`, `/user/teams`) → asigna rol
3. JWT firmado con `NEXTAUTH_SECRET` → cookie HttpOnly, Secure, SameSite=Strict
4. Cada request al backend FastAPI incluye `Authorization: Bearer <token>`
5. FastAPI valida firma con `NEXTAUTH_SECRET` (HMAC HS256) — **sin consulta a base de datos**
6. Rol extraído del claim JWT → guarda control de acceso por endpoint

### Middleware Next.js

```typescript
// Rutas protegidas por rol
/admin/*           → solo superadmin
/analysis/new      → superadmin | editor
/graph, /results   → todos los roles autenticados
```

### Variables de Entorno

**Vercel (web):**
```
NEXTAUTH_SECRET
NEXTAUTH_URL
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_ORG
SUPERADMIN_GITHUB_LOGINS
BACKEND_URL
```

**Railway (api):**
```
NEXTAUTH_SECRET          # mismo valor que en web
ANTHROPIC_API_KEY
OPENAI_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

---

## 4. Motor de IA y Algoritmo de Scoring

### Fórmula

```
Score_total = (W_afinidad × S_afinidad) + (W_historial × S_historial) + (W_intereses × S_intereses)
Score_total ∈ [0, 100]
```

**Pesos por defecto (ajustables por Editor):**
- W_afinidad = 0.40
- W_historial = 0.35  
- W_intereses = 0.25

### S_afinidad (Afinidad Geopolítica)

- Coincidencia en resoluciones/votaciones Asamblea General ONU — últimos N años (5/10/20)
- Fuente: UN Digital Library / UN DATA API
- Pertenencia a bloques multilaterales: APEC, OECD, BRICS, NATO, Mercosur, OEA, UE, ASEAN

### S_historial (Historial de Acuerdos)

Jerarquía del **Artículo 38 del Estatuto CIJ:**

| Nivel | Tipo | Multiplicador de peso |
|-------|------|----------------------|
| 1 (Críticos) | Tratados de Alianza, Paz y Límites | ×3.0 |
| 2 (Estructurales) | TLCs, Integración Regional | ×2.0 |
| 3 (Complementarios) | Cooperación Técnica, Convenios Culturales | ×1.0 |

**Penalización por litigios activos:** -15 puntos por caso pendiente ante CIJ, CPA o CIADI.

### S_intereses (Intereses Comunes)

- Complementariedad comercial (exportaciones/importaciones)
- Coincidencia en agenda global: Transición Energética, Seguridad Regional, Candidaturas Multilaterales

### Pipeline de Análisis

```
AnalysisCaseDTO (Zod validado)
    ↓
[1] RAG in-memory: ingesta fuentes oficiales en tiempo real
    (UN DATA API, dominios .gov/.org/.un.org verificados)
    ↓
[2] PDF pipeline (si hay adjuntos):
    pdfplumber → chunks 1,500 tokens (overlap 200) → sanitización
    ↓ (PDFs grandes >10MB: pre-signed URL → R2/S3 → streaming)
[3] Scoring determinístico pre-LLM
    ↓
[4] LLM: Instructor + Anthropic SDK (claude-opus-4-5 primario)
    System prompt Embajador + 3 few-shot + CoT obligatorio
    ↓
[5] Streaming → ThreeScenariosResult (Pydantic v2 strict)
```

### Estrategia de Prompting

- **System Prompt:** Perfil Embajador 35 años + mandato de neutralidad diplomática + protocolo CIJ Art. 38
- **Few-Shot:** 3 casos reales (Peru-Chile, Brasil-Argentina, Singapur-ASEAN)
- **Chain-of-Thought:** justificación obligatoria antes de emitir valores numéricos
- **Output:** `ThreeScenariosResult` — exactamente 3 escenarios, sin excepción

### Schema AnalysisCaseDTO (Pydantic v2)

```python
class AnalysisCaseDTO(BaseModel):
    target_profiles: list[TargetProfile]        # 1-N entidades
    geopolitical_context: GeopoliticalContext
    diplomatic_objective: DiplomaticObjective
    scoring_weights: ScoringWeights             # validación sum=1.0
    analysis_period_years: Literal[5, 10, 20]
    support_documents: list[DocumentChunk] = []

class ScoringWeights(BaseModel):
    w_affinity: float = 0.40
    w_history: float = 0.35
    w_interests: float = 0.25

    @model_validator(mode="after")
    def weights_must_sum_to_one(self) -> "ScoringWeights":
        if not abs(self.w_affinity + self.w_history + self.w_interests - 1.0) < 0.001:
            raise ValueError("Weights must sum to 1.0")
        return self
```

### Schema ThreeScenariosResult

```python
class Scenario(BaseModel):
    label: Literal["A", "B", "C"]
    name: str
    strategy: str
    roadmap: list[RoadmapStep]
    pros: list[str]
    cons: list[str]
    leverage_points: list[str]
    score_total: float                 # ∈ [0, 100]
    viability_score: float             # ∈ [0, 100]
    sources: list[SourceCitation]
    chain_of_thought: str              # CoT obligatorio

class ThreeScenariosResult(BaseModel):
    scenarios: Annotated[list[Scenario], Len(3, 3)]  # exactamente 3
    analysis_metadata: AnalysisMetadata
```

### Resiliencia LLM

- Exponential backoff + jitter: 3 reintentos en errores 429/5xx
- Circuit breaker: si Anthropic falla → fallback automático a OpenAI
- Rate limiting: Upstash Redis Token Bucket, 60 req/min por token de usuario

---

## 5. Grafo Interactivo

### Stack de Visualización

**Cytoscape.js** con renderer WebGL (`cytoscape-webgl`) para soporte de >1,000 nodos con rendimiento fluido.

### Tipos de Datos

```typescript
interface DiplomaticNode {
  id: string
  type: "country" | "embassy" | "diplomat" | "organization"
  label: string
  region: GeopoliticRegion
  affinityScore: number          // 0-100
  clusterId: string
}

interface DiplomaticEdge {
  source: string
  target: string
  type: "bilateral_treaty" | "trade_agreement" | "un_vote_alignment" | "dispute"
  weight: number
  treatyLevel: 1 | 2 | 3
}
```

### Capacidades del Canvas

- Drag-and-drop, zoom suave, pan
- Clustering automático por región geopolítica (`cose-bilkent` layout)
- Dijkstra shortest path entre dos nodos: `cy.elements().dijkstra()`
- Selección de nodo → Slide-over Sheet lateral (sin perder contexto del mapa)
- Filtros: por región, afinidad >75%, tipo de acuerdo, estado de relación

### Paleta Google Material en el Grafo

| Color | Uso |
|-------|-----|
| `#4285F4` Google Blue | Nodos país, acciones clave |
| `#34A853` Google Green | Hitos favorables, alta afinidad |
| `#FBBC05` Google Yellow | Fricciones, afinidad media |
| `#EA4335` Google Red | Disputas, riesgo alto |
| `#5F6368` Google Gray | Relaciones inactivas |

---

## 6. UI/UX

### Tipografía

**Urbanist** (Google Fonts) — obligatoria y exclusiva para todos los elementos: encabezados, cuerpo, componentes, etiquetas del grafo.

### Paleta

Google Brand / Material Design Color System (ver tabla sección 5).

### Componentes Clave

1. **Canvas Principal** — Cytoscape.js fullscreen con controles flotantes
2. **Slide-over Sheet** — ficha técnica del nodo seleccionado (Shadcn `Sheet`)
3. **Filtros Avanzados Bar** — región, afinidad, tipo de acuerdo, estado
4. **Stepper de Configuración** — formulario multi-paso `AnalysisCaseDTO` con validación Zod en tiempo real + botón "Cargar Caso de Ejemplo"
5. **Resultados 3 Escenarios** — tabs A/B/C con mapa de decisión interactivo (React Flow / Cytoscape)
6. **Exportación PDF** — `react-pdf/renderer` por escenario, con referencias y URLs clicables

### Mapa de Decisión Visual por Escenario

- Árbol interactivo codificado por color: verde (favorable), ámbar (fricción), azul (acción clave)
- Implementado con React Flow o Cytoscape (SVG)
- Detalle de CoT, factores evaluados, puntos de bifurcación

---

## 7. Fuentes de Datos y Validación

### Fuentes Autorizadas

- UN Digital Library / UN DATA API (votaciones AGNU)
- Cancillerías y Ministerios de RREE (dominios .gov, .gob.*)
- Organismos multilaterales: Banco Mundial, FMI, APEC, UE, OAS, ASEAN (dominios .org, .eu)
- Medios de reputación comprobada y acceso abierto: FT, Reuters, Bloomberg, BBC, The Economist, AFP

### Protocolos de Validación

- Whitelist de dominios: `.gov`, `.gob.*`, `un.org`, `europa.eu`, dominios verificados de prensa
- Sanitización: normalización Unicode NFC, remoción de caracteres no imprimibles
- Prompt Injection Mitigation: filtro de patrones de inyección antes de incluir contenido externo en prompts
- Validación estructurada Zod (frontend) / Pydantic v2 (backend): rechazo inmediato de payloads no conformes

---

## 8. Lineamientos de Código

- **TypeScript Strict:** cero `any`. Interfaces explícitas para Nodos, Aristas, DTOs, Respuestas LLM
- **Modularidad:** `lib/services/`, `lib/hooks/`, `components/graph/`, `components/ui/`, `app/api/`
- **Manejo de errores:** RFC 7807 Problem Details en FastAPI (`ProblemDetail` response model)
- **Formato:** código limpio compatible con conversión Markdown → `.docx`
- **Sin base de datos:** cero escrituras persistentes en servidor — toda sesión es stateless

---

## 9. Decisiones de Diseño y Justificaciones

| Decisión | Alternativa descartada | Razón |
|----------|----------------------|-------|
| Railway para FastAPI | Vercel Python runtime | Timeout 60s insuficiente para LLM streaming + PDF pesados |
| GitHub OAuth exclusivo | Supabase Auth / Auth0 | Simplifica el stack — el equipo ya usa GitHub, elimina tercero adicional |
| Cytoscape.js + WebGL | D3.js | Mejor rendimiento nativo para >1,000 nodos sin reimplementar física |
| Instructor sobre LangChain puro | LangChain chains | Output estructurado más confiable, menor overhead, mejor type safety |
| react-pdf/renderer (cliente) | Generación PDF en servidor | Elimina carga en Railway, PDF generado instantáneo sin round-trip |

---

## 10. Criterios de Éxito

- [ ] Autenticación GitHub OAuth funcionando con los 3 roles RBAC
- [ ] Grafo renderiza >500 nodos a 60fps en Chrome/Firefox
- [ ] Scoring geopolítico produce resultado en <2s (sin LLM)
- [ ] LLM genera 3 escenarios estructurados en <45s con streaming visible
- [ ] PDFs hasta 50MB procesados sin error (chunking + R2)
- [ ] Exportación PDF por escenario con referencias clicables
- [ ] Rate limiting activo: 60 req/min por token
- [ ] Cero `any` en TypeScript, cero errores `validate.py` en schemas Pydantic
