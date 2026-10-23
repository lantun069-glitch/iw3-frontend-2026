# Contrato — Rediseño visual (F7, UI profesional)

Cubre solo presentación/UX: tipografía, color, espaciado, componentes
compartidos (header, botones, badges), accesibilidad y el inicio como
resumen útil. **No es un requisito de T1/T2** (no hay TP asignado en
la matriz): corresponde a la práctica FE "11 UI profesional" de
CLAUDE.md §13, pedida directamente por el usuario en esta unidad. No
cambia ningún cálculo, contrato de API, permiso ni regla de negocio -
ver `docs/contrato-f7-monitoreo-ordenes.md` y
`docs/contrato-f7-tiempos-carga.md` para lo que sí es contrato.

## Decisión: sin biblioteca de componentes, con una de gráficos

- **Sin biblioteca de componentes** (ej. MUI): se evaluó, pero con
  solo 3 pantallas un sistema de variables CSS (`index.css`: color,
  espaciado, tipografía, botones compartidos `.btn`) alcanza el look
  minimalista pedido sin sumar peso ni una dependencia más que
  verificar contra el Node fijado.
- **`recharts@2.15.4`** (no la rama 3.x) para el único gráfico (barras
  por estado en el inicio): la rama 3.x reescribió su estado interno
  sobre Redux Toolkit/immer/react-redux como dependencias directas,
  bastante peso para una sola barra de 4 valores. La rama 2.x no tiene
  esa dependencia (`lodash`, `d3-scale/shape/interpolate`,
  `react-smooth`, `react-resize-detector`) y su último release
  (`2.15.4`) sí declara soporte de React 19 en `peerDependencies`. npm
  marca la rama 2.x como "ya no activamente mantenida" (aviso de
  deprecación al instalar) - funciona correctamente hoy; si el equipo
  prefiere la 3.x más adelante, es un cambio aislado a
  `WelcomePage.tsx` (único archivo que importa `recharts`).
- Costo real: el bundle de producción pasó de ~325 KB a ~707 KB
  (gzip ~213 KB) - Vite avisa que el chunk principal supera 500 KB.
  Para esta app (uso interno, no un sitio público de alto tráfico) se
  considera aceptable; si se quiere revertir, remover `recharts` y la
  sección de gráfico de `WelcomePage.tsx` sin tocar nada más.

## Qué hace

- `src/index.css`: variables de diseño (`:root`), reset, tipografía
  base, `:focus-visible` consistente, `.skip-link`, `.visually-hidden`,
  botones compartidos (`.btn`, `.btn-primary`, `.btn-secondary`,
  `.btn-link`), badges de estado (`.badge-estado-1..4`, movidos aquí
  desde `OrdersListPage.css` porque ahora los usan dos pantallas) y
  mensajes de estado compartidos (`.state-error`, `.state-empty`).
- `src/domain/estados.ts` (nuevo): única fuente de los 4 estados
  (número, etiqueta, color) para toda la UI - tabla, filtro, badges,
  tarjetas del inicio y gráfico. No agrega ningún estado nuevo, son
  los mismos 1-4 que ya valida el backend.
- `src/components/EstadoBadge.tsx` y `src/utils/formato.ts` (nuevos):
  el badge de estado y el formateo de números/fechas/tiempo
  transcurrido/ETA que antes vivían solo en `OrdersListPage.tsx` se
  movieron aquí para que el inicio los reutilice sin copiarlos -
  mismo comportamiento, sin cambios de contrato ni de TP32/TP33.
- `src/components/AppHeader.tsx` (nuevo): nav (Inicio/Órdenes),
  usuario, logout. Se renderiza una sola vez desde `ProtectedRoute`
  (no se duplica en cada pantalla); no decide permisos ni sesión, solo
  lee lo que ya expone `useAuth`.
- `src/pages/LoginPage.tsx`: misma lógica de validación/envío, solo
  tarjeta centrada con el sistema de botones compartido.
- `src/pages/WelcomePage.tsx` (antes bienvenida vacía, ahora "Inicio"):
  ver sección siguiente.
- `src/pages/OrdersListPage.tsx`: badges de estado con color
  consistente con el inicio; filtro inicial leído de `?estado=` en la
  URL (para que las tarjetas/barras del inicio naveguen con el filtro
  ya aplicado); layout de tabla ajustado (ver "Ancho de la tabla").
- Quitado de `WelcomePage`: la aclaración técnica sobre roles/
  autorización que mostraba antes la pantalla ("solo para mostrar; la
  autorización real la aplica el backend...") - esa explicación vive
  en comentarios de código y en este documento, no en la pantalla.

## Inicio: resumen operativo en tres niveles

**Arriba — tarjetas (sin cambios de fondo, más compactas):** total +
una por estado, cada una un `<Link>` real a `/ordenes` o
`/ordenes?estado=N` - navegación accesible por teclado/lector de
pantalla, no depende del gráfico.

**Centro — dos columnas (una en pantallas angostas, `max-width:
900px`):**

- *Izquierda, "Órdenes por estado":* barras horizontales
  (`recharts`, `layout="vertical"`), mismo color por estado que las
  tarjetas y los badges de la tabla (`ESTADO_COLORS`). Cada barra
  termina con una etiqueta `cantidad (porcentaje%)`
  (`LabelList`); el panel aclara el denominador en texto ("Porcentaje
  sobre el total de órdenes (N)"). Tooltip con el mismo detalle. Click
  en una barra navega igual que la tarjeta correspondiente (por
  índice sobre el array `datos`, no por el shape interno que
  `recharts` pasa al callback). El contenedor tiene `role="img"` y un
  `aria-label` con el resumen en texto - las tarjetas son la vía
  accesible principal, el gráfico es un complemento visual, no el
  único camino de navegación.
- *Derecha, "Pendientes del circuito":* dos filas, **recibidas
  pendientes de tara** (`resumen.porEstado[1]`) y **cerradas
  pendientes de pesaje final** (`resumen.porEstado[3]`) - mismos
  números que la tarjeta/barra de esos estados, solo reencuadrados
  con el verbo de la acción pendiente (qué hay que hacer, no solo
  cuántas hay). Cada fila es un `<Link>` a `/ordenes?estado=1` o
  `/ordenes?estado=3`. Sin alarmas: ese panel queda para su propia
  unidad.

**Abajo — "Lecturas más recientes":** hasta 5 órdenes (número,
patente, badge de estado, última lectura, ETA), ordenadas por
`fechaUltimaLectura` descendente. El badge de estado nunca usa la
palabra "Cargando" para el estado 2 (reutiliza `EstadoBadge`/
`ESTADO_LABELS`, igual que la tabla - "Tara registrada", porque el
estado 2 también cubre órdenes que todavía esperan la activación).

### Datos reales, sin descargas completas ni páginas arbitrarias

- `obtenerResumenEstados` (`ordersApi.ts`): 5 llamadas a
  `GET /api/v1/orders` con `size=1` (una sin filtro para el total, una
  por cada estado 1-4), leyendo `totalElements` de cada respuesta -
  **nunca cuenta `content.length` de una página ni descarga todas las
  órdenes**. Si cualquiera de las 5 falla, la función entera rechaza.
- `obtenerOrdenesRecientes(5)` (`ordersApi.ts`): una llamada a
  `GET /api/v1/orders?size=5&sort=fechaUltimaLectura,desc` - mismo
  campo ordenable que ya valida/expone TP31, sin endpoint nuevo.
  **Verificado contra el backend real** (2026-10-23, usuario con
  `ROLE_OPERADOR`, 87 órdenes de prueba): en MySQL, `ORDER BY ... DESC`
  deja los `NULL` al final (`ASC` los deja primero, confirmado
  empíricamente con ambas direcciones) - la consulta devolvió las 5
  fechas reales más recientes en orden estrictamente descendente, sin
  ninguna fila `null` intercalada. **No hizo falta ningún ajuste de
  backend.** El resultado igual se filtra explícitamente
  (`fechaUltimaLectura !== null`) como salvaguarda documentada para el
  caso con menos de 5 órdenes con lectura (ahí sí podrían aparecer
  filas `null` al final de esa página chica), no porque se haya
  observado el problema.
- Si una actualización posterior falla pero ya había datos válidos en
  pantalla (resumen o recientes), **se conservan** (con el aviso de
  error arriba) en vez de borrarse o mostrar ceros/vacío.
- Porcentajes: `calcularPorcentaje` (`utils/formato.ts`) devuelve `0`
  si el total es `<= 0` en vez de dividir por cero; en la práctica el
  panel solo se renderiza cuando `resumen.total > 0`, pero la función
  es defensiva igual.
- Actualización manual (mismo criterio que TP31: sin polling/
  WebSocket), con fecha/hora de la última actualización exitosa,
  estado de carga (botón "Actualizando…"), error (`role="alert"`) y
  vacío ("No hay órdenes registradas todavía", solo cuando el total
  real es 0, nunca por una consulta fallida).
- Sin métricas inventadas: total, cantidad/porcentaje por estado y las
  5 lecturas más recientes, todo real. Sin tendencias históricas ni
  gráficos de telemetría (no hay consulta para eso todavía). Un solo
  gráfico (el de barras por estado) - no se agregó ninguno más.

## Ancho de la tabla de órdenes

- Se quitó el `max-width` de `.orders-list-page` (antes 1100px): la
  página usa el ancho disponible con un margen lateral chico
  (`var(--space-6)`, igual que el header).
- Encabezados de columna con `white-space: normal` (antes `nowrap`):
  los títulos largos ("Masa acumulada (kg)", "Tiempo transcurrido")
  pueden partirse en dos líneas en vez de forzar columnas
  artificialmente anchas. Las celdas de datos siguen en una sola línea
  (`white-space: nowrap`): sus valores son cortos y no se benefician
  de partirse.
- `.orders-table-wrap` conserva `overflow-x: auto`: en una pantalla
  amplia, con los encabezados ya envueltos, las 11 columnas entran sin
  necesitar scroll; en una pantalla angosta, sigue apareciendo scroll
  horizontal en vez de ocultar columnas o cortar contenido.
- Ninguna columna ni dato se ocultó para lograr esto.

## Verificación realizada

- `npm run build` (`tsc -b && vite build`) y `npm run lint`: sin
  errores ni advertencias, con todos los cambios de esta unidad
  aplicados (incluye los cambios pendientes de TP32/TP33, que no se
  tocaron).
- Dev server (`npm run dev`, ya estaba corriendo con HMR) sirviendo
  los archivos actualizados en `http://localhost:5173`.

## Evidencia manual del usuario (2026-10-23)

El usuario aprobó visualmente el diseño general y confirmó
puntualmente, contra el frontend y backend reales:

- Las tarjetas y las barras del gráfico del inicio abren Órdenes con
  el filtro correcto (`/ordenes?estado=N`, misma navegación para
  ambos caminos).
- El botón "Actualizar" del inicio mantiene la sesión activa (no
  desloguea ni redirige a `/login`) y actualiza la fecha/hora
  mostrada ("Actualizado: ...").

Esto confirma la aprobación general del look del rediseño y esos dos
flujos de navegación/actualización puntuales — **no equivale a
verificar cada caso por separado**: no se marcan como probados el
header en mobile, el login, los estados de carga/error/vacío del
inicio, el panel "Pendientes del circuito", la tabla de lecturas
recientes, ni la tabla de órdenes en pantalla angosta/amplia real,
porque no hay evidencia puntual de esos casos todavía.

## Pendiente explícito

Revisión visual conjunta con el usuario de los casos sin evidencia
todavía: header responsive en mobile, login, estados de carga/error/
vacío del inicio, panel de pendientes y tabla de lecturas recientes
(interacción y datos reales en pantalla), y la tabla de órdenes en
una pantalla amplia real (sin scroll) y en una angosta real (con
scroll, sin columnas ocultas). No reemplaza la revisión visual
pendiente de TP32/TP33 (ver `docs/contrato-f7-tiempos-carga.md`), que
sigue aparte. Panel de alarmas: deliberadamente no incluido, queda
para su propia unidad.
