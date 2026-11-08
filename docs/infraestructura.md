# Infraestructura de DipApp: riesgos, keep-alive y runbook

Última auditoría: 2026-11-08. Entorno cubierto: producción (no existe staging).

Supuestos (la plantilla de contexto llegó sin completar):

- Canal de alertas: **issues de GitHub** con la etiqueta `infra-alert`. GitHub envía un correo al dueño del repositorio cuando se abre un issue o cuando falla un workflow programado. No requiere cuentas ni secretos nuevos.
- Presupuesto: **solo gratuito**.

## 1. Inventario

| Componente | Proveedor / plan | Dónde se ve en el repo |
|---|---|---|
| Frontend Next.js 14 + Auth.js | Vercel, plan Hobby. URL `https://12-dipapp.vercel.app` | `vercel.json`, `apps/web/vercel.json` |
| Backend FastAPI (`dipapp-api`) | Render, plan Free web service. URL `https://dipapp-api.onrender.com` | `apps/api/Dockerfile`, `apps/web/src/app/(dashboard)/admin/page.tsx` (`railway.toml` es un vestigio: Railway no está en uso) |
| Caché de datos del grafo | Sistema de archivos efímero del contenedor de Render (`/tmp/dipapp_cache`) | `apps/api/services/data_pipeline/cache.py` |
| Rate limiting | Upstash Redis REST (opcional: si no está configurado, el limitador falla en abierto) | `apps/api/middleware/rate_limit.py` |
| LLM | Anthropic API (principal) y OpenAI (respaldo) | `apps/api/services/llm_orchestrator.py` |
| Autenticación | GitHub OAuth App + usuarios locales (`DIPAPP_USERS`) | `apps/web/src/auth.ts` |
| CI y monitor | GitHub Actions; repositorio **público**; rama por defecto `feat/dipapp-implementation` | `.github/workflows/` |
| Fuentes de datos públicas | World Bank, WTO, UCDP, Wikidata, COW, ICB, Voeten (sin cuenta) | `apps/api/services/data_pipeline/` |
| Dominios / TLS | Subdominios gestionados `*.vercel.app` y `*.onrender.com`. No hay dominio propio que renovar | — |
| Base de datos | **No hay.** No se almacenan datos de negocio persistentes | — |

## 2. Límites por proveedor

Fuentes oficiales consultadas el 2026-11-08: [Render – Deploy for Free](https://render.com/docs/free), [GitHub – Disable and enable workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows), [Vercel – Hobby plan](https://vercel.com/docs/plans/hobby) y [Upstash – Redis FAQ](https://upstash.com/docs/redis/help/faq).

| Componente | Plan | Política de inactividad | Reactivación | Riesgo de pérdida de datos | Cuotas y vencimientos críticos | Riesgo |
|---|---|---|---|---|---|---|
| Backend (Render) | Free | Se apaga tras **15 min sin tráfico entrante**. Cualquier petición HTTP cuenta como actividad. | Automática con la siguiente petición; tarda **≈1 min**. El monitor midió 44 s. | La caché en `/tmp` se pierde, pero se regenera desde fuentes públicas. No hay datos de negocio. | **750 h de instancia por mes y por workspace**. Si se agotan, Render **suspende todos los servicios Free hasta el día 1 del mes siguiente**. Mantenimientos sin aviso. | **Medio** |
| Frontend (Vercel) | Hobby | No tiene. | — | Ninguno: el código vive en Git. | 100 GB Fast Data Transfer, 1 M invocaciones de funciones, 10 GB Fast Origin Transfer. Si se exceden, la app se **pausa ≈30 días** (`503 DEPLOYMENT_PAUSED`) y no se puede pagar el exceso sin pasar a Pro. Hobby es solo para uso no comercial. | Bajo–medio |
| GitHub Actions (monitor y CI) | Gratis (repo público) | En repos públicos, los workflows **programados se desactivan tras 60 días sin actividad** en el repositorio. | Manual (botón *Enable workflow*) o por API. | Ninguno. | Minutos ilimitados en repos públicos. | **Alto** para el monitor (mitigado) |
| Upstash Redis | Free (si existe) | Se **archiva tras ≥30 días sin actividad**, con correos de aviso previos. | Manual: crear una base nueva y restaurar el backup de archivado. | Bajo: guarda solo contadores efímeros de rate limiting. Upstash conserva un backup al archivar. | Comandos y almacenamiento del plan gratuito. | Bajo |
| Anthropic / OpenAI | Prepago por uso | No tienen. | — | — | **Saldo de créditos**: si se agota, `/analysis` falla. Las claves no tienen fecha de expiración por defecto. El saldo no se puede consultar sin una clave de administrador. | Medio |
| GitHub OAuth App | Gratis | No tiene para el client secret. | — | — | El client secret no vence salvo que se rote. | Bajo |
| TLS | Gestionado por Render y Vercel | — | Renovación automática | — | El monitor avisa si un certificado vence en menos de 30 días. Medido: onrender.com, 42 días. | Bajo |
| Fuentes públicas de datos | Sin cuenta | — | — | — | Caídas puntuales; caché de 24 h. | Bajo |

## 3. Diagnóstico de estado (2026-11-08)

| Servicio | Evidencia | Estado |
|---|---|---|
| Backend Render | `GET /health` → `HTTP 200 {"status":"ok","service":"dipapp-api"}` en 44 s (arranque en frío). [Ejecución #1](https://github.com/ehchavezm-hub/12-dipapp/actions/runs/42492306775) | ✅ Activo; estaba dormido |
| Frontend Vercel | `GET https://12-dipapp.vercel.app/login` → `200`. [Ejecución #3](https://github.com/ehchavezm-hub/12-dipapp/actions/runs/42492963266) | ✅ Activo |
| TLS | onrender.com: 42 días; vercel.app: 81 días | ✅ |
| Ciclo de alertas | Las alertas [ehchavezm-hub/12-dipapp#1](https://github.com/ehchavezm-hub/12-dipapp/issues/1) y [ehchavezm-hub/12-dipapp#2](https://github.com/ehchavezm-hub/12-dipapp/issues/2) se abrieron en las pruebas y el monitor las **cerró solo** al detectar la recuperación ([run 3](https://github.com/ehchavezm-hub/12-dipapp/actions/runs/42492963266)) | ✅ |
| CI (`ci.yml`) en `main` | Las ejecuciones 154–158 están en **failure** (por ejemplo, [run 42260022714](https://github.com/ehchavezm-hub/12-dipapp/actions/runs/42260022714)) | ⚠️ Se reporta, no se corrige: es lógica de la app y queda fuera del alcance |
| Upstash Redis | El backend no expone si está configurado y no hay secretos en GitHub | ❓ Sin verificar |
| Saldo Anthropic / OpenAI | Requiere acceso a la consola | ❓ Sin verificar |

## 4. Matriz de riesgo y acciones

| Plataforma | Riesgo | Acción tomada | Cómo se verificó | Estado | Evidencia |
|---|---|---|---|---|---|
| GitHub Actions: auto-desactivación a los 60 días | Alto | Cada ejecución llama a `PUT /actions/workflows/infra-heartbeat.yml/enable` con el `GITHUB_TOKEN` del repo. Así se reinicia el contador sin commits de relleno. | Respuesta `enable → HTTP 204` en ejecuciones reales | ✅ Verificado. **Activo solo cuando el workflow esté en la rama por defecto** | [run](https://github.com/ehchavezm-hub/12-dipapp/actions/runs/42492306775) |
| Backend Render: spin-down y suspensión por horas | Medio | Health check cada 6 h con timeout de 90 s y 4 reintentos con backoff (10, 20 y 40 s). Detecta caídas o suspensión y abre una alerta. | Camino OK: `200`. Camino de fallo con una URL inválida: 4 × `404` → issue creado y ejecución en rojo. | ✅ Verificado | OK: [run 1](https://github.com/ehchavezm-hub/12-dipapp/actions/runs/42492306775) · Fallo: [run 2](https://github.com/ehchavezm-hub/12-dipapp/actions/runs/42492546321) → [ehchavezm-hub/12-dipapp#2](https://github.com/ehchavezm-hub/12-dipapp/issues/2) |
| Frontend Vercel: pausa por cuota | Bajo–medio | Health check de `/login` cada 6 h; detecta `DEPLOYMENT_PAUSED` o un 5xx. | `200` en ejecución real | ✅ Verificado | [run 3](https://github.com/ehchavezm-hub/12-dipapp/actions/runs/42492963266) |
| Upstash: archivado a los 30 días | Bajo | El monitor envía `DBSIZE` (solo lectura, llega a la base) cada 6 h **si existen los secretos**. Con 6 h queda muy por debajo del máximo de 10 días (1/3 del umbral). | No se pudo: faltan los secretos | ⏸️ **Pendiente**: agregar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en GitHub → Settings → Secrets → Actions | — |
| TLS | Bajo | Aviso si un certificado vence en menos de 30 días | 42 días medidos | ✅ | run 1 |
| Saldo LLM | Medio | Solo se documenta. El monitor avisa si `/health/config` reporta que falta `ANTHROPIC_API_KEY`. | — | ⚠️ Límite residual | — |
| Cambios de política de los proveedores | — | Revisión trimestral automática (días 2 de ene, abr, jul y oct): vuelve a leer la documentación oficial y abre un issue con el checklist. Si un umbral cambió, lo etiqueta `infra-alert`. | Ejecución real: Render (`15 minutes`, `750`) y Upstash (`30 days`) confirmados en la documentación en vivo. En **GitHub** (`60 days`) y **Vercel** (`100 GB`) la comparación automática no encuentra la frase en el HTML servido, aunque la página responde `200`; probablemente el contenido se renderiza en el cliente. Esas dos políticas salen siempre como **REVISAR** y se verifican a mano (fallo seguro). | ⚠️ Verificado parcialmente | [run 6](https://github.com/ehchavezm-hub/12-dipapp/actions/runs/42493471149) → [ehchavezm-hub/12-dipapp#5](https://github.com/ehchavezm-hub/12-dipapp/issues/5) |

### Por qué no se mantiene Render despierto 24/7

Mantener el backend siempre encendido consume entre 720 y 744 h al mes, casi todo el cupo de 750 h del workspace. Si hay otro servicio Free en el mismo workspace, o si coinciden varios pingers, se superaría el cupo y Render suspendería **todos** los servicios Free hasta fin de mes, que es peor que un arranque en frío de un minuto. Por eso el monitor corre cada 6 h: detecta fallos sin consumir horas de forma relevante.

En el código ya había dos mecanismos para mantenerlo despierto:

- `KeepAlive.tsx` hace ping cada 10 min, pero solo mientras alguien tiene abierto el dashboard. Es razonable.
- El endpoint `/keepalive` menciona un cron en cron-job.org cada 14 min. **No pude verificar si ese cron existe.** Si existe, revisa en Render → Billing que el consumo mensual quede por debajo de 750 h.

### Respaldo de datos

No existe base de datos ni datos de negocio persistentes. La caché se regenera desde fuentes públicas, así que no hace falta un respaldo de base de datos.

El único estado que no se puede reconstruir son las **variables de entorno** de Render y Vercel (`DIPAPP_USERS`, `NEXTAUTH_SECRET`, claves de API, OAuth).

**Propuesta pendiente de aprobación:** guardar una copia cifrada de esas variables en un gestor de contraseñas. Es manual, no tiene costo y no la automatizo para no sacar secretos de los proveedores.

## 5. Límites residuales

| Lo que la automatización no cubre | Opción que lo elimina | Costo aproximado |
|---|---|---|
| El arranque en frío del backend (≈1 min tras 15 min sin tráfico) y la suspensión si se agotan las 750 h | Render Starter (sin spin-down) | ≈ USD 7/mes por servicio |
| La pausa de Vercel por exceder la cuota Hobby, y la restricción de uso no comercial | Vercel Pro | ≈ USD 20/mes por usuario más uso |
| El saldo de créditos de Anthropic y OpenAI: no se puede consultar sin una Admin API key | Activar la recarga automática y los avisos de gasto en cada consola | Según el consumo |
| La caché efímera en `/tmp`, que se pierde en cada arranque | Render Persistent Disk (plan pago) o Upstash como caché | ≈ USD 0,25/GB al mes más Starter |
| Los cron de GitHub pueden retrasarse o saltarse en horas de alta carga | Monitor externo gratuito (UptimeRobot, Better Stack) sobre `/health`. Solo se recomienda si el backend pasa a ser crítico; hoy no se justifica. | Gratis (requiere crear una cuenta, pendiente de tu decisión) |
| El cupo de horas usadas en Render y el uso en Vercel no se pueden consultar sin tokens de API de esas cuentas | Agregar tokens de solo lectura como secretos para alertar al llegar al 80 % | Gratis; requiere tu autorización |

Los precios provienen de agregadores de 2026. Confírmalos en [render.com/pricing](https://render.com/pricing) y [vercel.com/pricing](https://vercel.com/pricing) antes de contratar.

## 6. Runbook

Todas las alertas llegan como un issue `🚨 Infra alert: <componente>`. El issue incluye el detalle, los pasos para restaurar y el enlace a la ejecución. El monitor **cierra el issue solo** cuando el servicio se recupera.

**`backend`**

1. Abre el enlace de la ejecución y revisa el código HTTP:
   - `0` o timeout: caída o arranque fallido.
   - `404`: el servicio no existe o la URL cambió.
   - `503`: suspendido o en despliegue.
2. Entra a <https://dashboard.render.com> → `dipapp-api` → **Events**.
   - Si dice *Suspended* por las horas Free agotadas: espera al día 1 o sube a Starter (requiere tu decisión de facturación).
   - Si falló un deploy: abre **Logs**, corrige el error o usa **Manual Deploy → Deploy latest commit** / **Rollback**.
3. Si la URL cambió: actualiza la variable de repo `BACKEND_URL` (Settings → Variables → Actions) y `BACKEND_URL` en Vercel.
4. Ejecuta *Actions → Infra heartbeat → Run workflow* (desde la rama por defecto) para confirmar.

**`frontend`**

1. Si ves `503 DEPLOYMENT_PAUSED`: entra a <https://vercel.com/dashboard> → proyecto → **Usage** e identifica la métrica excedida. Espera la reactivación (≈30 días) o sube a Pro.
2. Si es un 5xx: Vercel → **Deployments** → último deploy *Ready* → **Promote / Redeploy**.
3. Si cambió el dominio: define la variable de repo `FRONTEND_URL`.

**`upstash`**

1. Entra a <https://console.upstash.com>. Si la base está *archived*: crea una base nueva → **Restore** desde el backup.
2. Actualiza `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en Render y en GitHub Secrets.
3. Mientras tanto la app sigue funcionando: el limitador falla en abierto.

**`tls`**

1. Son certificados gestionados. Si faltan menos de 30 días, revisa en Render o Vercel que el dominio esté verificado.
2. Si no se renueva, abre un ticket con el proveedor.

**`scheduler`**

1. Entra a Actions → *Infra heartbeat* → **Enable workflow**.
2. Revisa que en Settings → Actions → General las Actions estén permitidas y que *Workflow permissions* permita lectura y escritura, o al menos los permisos que declara el workflow.

**Revisión trimestral (issue `🗓️ Revisión trimestral…`)**

1. Revisa la tabla: si alguna política marca **REVISAR**, abre la documentación enlazada y actualiza la §2 de este documento.
2. Completa el checklist manual: horas de Render, uso de Vercel y saldo de LLM.
3. Cierra el issue.

## 7. Operación del monitor

- Archivos: `.github/workflows/infra-heartbeat.yml` y `scripts/infra/heartbeat.py` (solo biblioteca estándar de Python; solo lectura sobre los servicios).
- Horarios:
  - Heartbeat cada 6 h (minuto 17, UTC).
  - Revisión trimestral el día 2 de ene, abr, jul y oct a las 14:41 UTC.
  - Se puede ejecutar a mano con *Run workflow* (`mode`: `heartbeat` o `review`).
  - También corre en cada push que modifique el monitor.
- **Requisito de activación:** GitHub solo ejecuta los cron desde la **rama por defecto** (hoy `feat/dipapp-implementation`, que está 60 commits detrás de `main`). Hay que fusionar estos archivos en esa rama, o cambiar la rama por defecto a `main` y fusionar allí.
- Permisos: el `GITHUB_TOKEN` es efímero y limitado a este repositorio, con `issues: write` (alertas), `actions: write` (re-habilitarse) y `deployments: read`. No se crearon tokens personales.
- Variables y secretos opcionales:
  - Variables de repo `BACKEND_URL` y `FRONTEND_URL`.
  - Secretos `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
  - Nunca se imprimen en los logs.
