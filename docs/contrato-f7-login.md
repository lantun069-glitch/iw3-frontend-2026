# Contrato — Login y sesión protegida (F7, primera unidad)

Cubre TP30 (login web) en su mínimo indispensable: autenticación real
contra el backend, sesión en memoria, ruta protegida y logout. No
cubre TP31-TP35 (monitoreo de órdenes, ETA, tiempo transcurrido,
alarmas, conciliación): quedan para unidades posteriores de F7, junto
con los endpoints de consulta que todavía no existen en el backend
(decisión ya registrada al cerrar F6, ver el backend).

## Fuente y alcance

- **CONFIRMADO (NotebookLM FE, cita directa):** *"El objetivo no será
  aprender React o Vue de memoria... construir aplicaciones web
  reales utilizando IA como herramienta de desarrollo profesional."*
  — no hay stack obligatorio; React/Vue y la librería de UI son
  decisión del equipo, con la única regla de cátedra de no mezclar
  varias librerías visuales principales.
- **DECISIÓN DEL EQUIPO:** React + TypeScript + Vite, sin biblioteca
  de UI completa para esta pantalla (CSS simple). Confirmado por el
  usuario antes de implementar.
- Patrón de login/sesión (estado local, validación, loading, logout,
  interceptor Bearer, redirección en 401) replica el ya enseñado en
  las clases de FE sobre estado/formularios y rutas/integración — no
  es una invención de esta unidad.

## Qué hace

- `POST /api/v1/login` (backend existente, sin modificar): username/
  password como parámetros de formulario; la respuesta es el JWT en
  **texto plano**, no JSON — `authApi.ts` lo pide explícitamente con
  `responseType: 'text'`.
- Token en memoria únicamente (decisión del equipo): recargar la
  página cierra la sesión. Nunca se guarda la contraseña, ni en
  memoria más allá del propio envío del formulario.
- Roles decodificados del JWT (`roles` claim) **solo para
  presentación** (`WelcomePage` los muestra); ninguna decisión de
  autorización se toma en el cliente — la aplica el backend en cada
  operación, como ya está implementado (`ROLE_OPERADOR`/
  `ROLE_SUPERVISOR`, ver el backend).
- `httpClient.ts`: instancia de Axios dedicada **exclusivamente** a
  esta API (nunca axios global), así que el header `Authorization`
  nunca se agrega a otras solicitudes. Interceptor de respuesta: un
  401 en un recurso protegido (no en el propio login) termina la
  sesión; un 403 **no** la termina — el usuario sigue autenticado,
  solo le falta permiso para esa operación puntual.
- `ProtectedRoute`: sin sesión, redirige a `/login`. La pantalla
  protegida (`WelcomePage`) es mínima a propósito: confirma la sesión
  y muestra usuario/roles, sin datos ficticios ni un dashboard
  simulado.
- Token/payload malformado o ya vencido al momento de loguearse: se
  detecta en el cliente (`jwt.ts`) y se muestra un error, sin dejar
  una sesión "a medias". Una expiración **durante** la sesión (el
  backend ya limita el JWT a 1 hora) se detecta de forma reactiva, en
  la siguiente llamada a la API que reciba 401 — no hay un timer
  propio que vigile la expiración de forma proactiva (decisión del
  equipo, para no anticipar infraestructura no pedida).
- Proxy de desarrollo de Vite (`/api` → `VITE_API_PROXY_TARGET`,
  default `http://localhost:8080`): evita depender del CORS abierto
  del backend durante `npm run dev`. `VITE_API_BASE_URL` (vacío por
  defecto) es la URL real para otros entornos — destino previsto: la
  VM, con configuración todavía pendiente; **no se introduce
  Vercel/Netlify**.

## Archivos

- `src/api/httpClient.ts`, `src/api/authApi.ts`
- `src/auth/jwt.ts`, `src/auth/context.ts`, `src/auth/AuthContext.tsx` (solo el componente `AuthProvider`), `src/auth/useAuth.ts` (solo el hook), `src/auth/ProtectedRoute.tsx`
- `src/pages/LoginPage.tsx` (+ `.css`), `src/pages/WelcomePage.tsx` (+ `.css`)
- `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts`
- `vite.config.ts` (proxy de desarrollo), `.env.example`, `.nvmrc`, `package.json` (`engines`)

## Verificación realizada

- `npx tsc -b`: sin errores. `npm run build`: compila. `npm run lint`:
  **0 errores, 0 warnings** (con Node 22.23.4; verificado después de
  separar el contexto en `src/auth/context.ts` y el hook en
  `src/auth/useAuth.ts`, dejando `AuthContext.tsx` con el único export
  del componente `AuthProvider` — resuelve el warning previo de
  `react-refresh/only-export-components` sin desactivar la regla).
- **Decodificación de JWT** (`src/auth/jwt.ts`), ejecutada con el
  código real (no una reimplementación), con un backend real
  corriendo: token vigente decodifica `sub`/`roles` correctamente y
  `estaExpirado` da `false`; token con `exp` vencido da `true`; token
  sin 3 segmentos y token con payload no-JSON lanzan
  `TokenInvalidoError` — 6/6 casos OK.
- **Interceptor HTTP** (`src/api/httpClient.ts`), ejecutado contra el
  backend real (no mockeado): token inválido en un endpoint protegido
  → 401 y dispara el fin de sesión; credenciales incorrectas en el
  propio login → 401 pero **no** dispara el fin de sesión; usuario sin
  rol asignado contra un endpoint `ROLE_SUPERVISOR` → 403 y la sesión
  sigue activa; usuario con el rol correcto → 200 (confirma que el
  header `Authorization` se adjunta y el backend lo acepta) — 8/8
  casos OK.
- **Integración real vía proxy:** `POST /api/v1/login` a través del
  proxy de Vite (puerto 5173) devuelve el mismo JWT que pegarle
  directo al backend (puerto 8080) — confirma que el proxy reenvía
  correctamente.
- **Verificación manual en navegador (realizada por el usuario,
  2026-10-23):** login correcto con un usuario `ROLE_OPERADOR` →
  redirige a la pantalla protegida; credenciales incorrectas → mensaje
  de error visible, sin redirigir; acceso directo a la ruta protegida
  sin sesión → redirige a `/login`; logout → vuelve a `/login`;
  recargar la página con sesión activa → pierde la sesión y vuelve a
  pedir login. Los 6 puntos del checklist, correctos. Esta es la
  prueba visual que las verificaciones anteriores (lógica de JWT,
  interceptor HTTP, build/lint) no podían cubrir por sí solas.
- **Límite de esta sesión, ya cubierto por la prueba manual de
  arriba:** esta sesión no instaló ningún navegador ni corrió
  automatización (instrucción explícita; con Node 22.23.4 ya
  instalado, la incompatibilidad de versión que impedía usar
  Playwright deja de aplicar, pero no se usó). Lo que no cubre una
  prueba manual puntual — regresión automatizada repetible — queda
  pendiente para una unidad futura, si se decide agregarla. Las
  verificaciones de esta sesión (lógica de JWT, interceptor HTTP,
  build/lint) cubrieron, con el código realmente compilado y contra
  el backend real, la lógica de decodificación/expiración y la de los
  interceptores HTTP (incluida la distinción 401 vs. 403), que es
  donde está la lógica no trivial
  de esta unidad por sí sola, sin cubrir la interacción visual
  (clicks, renderizado del formulario, navegación del router en el
  DOM) — eso es justamente lo que cubrió la prueba manual de arriba.

## Entorno: versión de Node

El sistema trae Node 18.19.1 (fin de soporte 2025-04-30, según el
calendario oficial de nodejs.org/nodejs/Release). `react-router-dom`
7.x y dependencias transitivas de `typescript-eslint` ya exigen Node
≥20. Se instaló **Node 22.23.4 LTS ("Jod")** — confirmado como línea
LTS activa (en mantenimiento desde 2025-10-21, soporte hasta
2027-04-30) contra `nodejs.org/dist/index.json` y el calendario
oficial de lanzamientos, no una suposición. Se descargó el binario
oficial (`node-v22.23.4-linux-x64.tar.xz`) y se verificó contra
`SHASUMS256.txt` de la misma fuente antes de extraerlo.

Instalación en espacio de usuario, sin `sudo` y sin tocar el Node del
sistema: `~/.local/opt/node-v22.23.4-linux-x64` (mismo criterio ya
usado en el backend para el JDK portable). `/usr/bin/node` sigue en
18.19.1. Versión fijada en `.nvmrc` (`22.23.4`) y en
`package.json` (`engines.node: ">=20.19.0"`, el piso real que exige la
dependencia transitiva más estricta encontrada).

`node_modules` se reinstaló con `npm ci` (lockfile y dependencias sin
cambios) usando este Node nuevo: 0 advertencias de `engines` en la
instalación (antes había varias, ver historial de la unidad).

## Pendiente / límites

- Sin prueba automatizada de regresión (solo manual puntual, ver arriba) — a considerar si se agrega infraestructura de testing en una unidad futura.
- Sin refresco de token ni logout automático por expiración activa
  (solo reactivo, ver "Qué hace").
- Hosting del frontend: VM, configuración pendiente. No se decidió
  mecanismo de build/despliegue todavía.
- TP31-TP35 y los endpoints de consulta que necesitan quedan para
  unidades posteriores de F7.
