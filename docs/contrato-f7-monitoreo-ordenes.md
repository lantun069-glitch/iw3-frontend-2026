# Contrato — Listado de órdenes para monitoreo (F7, segunda unidad)

Cubre la parte de frontend de TP31 (tabla/filtro/orden/paginación de
órdenes). No cubre TP32-TP35 (ETA, tiempo transcurrido, alarmas desde
UI, conciliación): quedan para unidades posteriores de F7.

## Qué hace

- `src/api/ordersApi.ts`: `listarOrdenes` contra `GET /api/v1/orders`
  del backend (ver `iw3-backend-sanitized`, checkpoint
  `2026-10-23-01`), con `AbortSignal` para cancelar una solicitud en
  vuelo.
- `src/pages/OrdersListPage.tsx` (+ `.css`): tabla con columnas
  ordenables (misma lista blanca que valida el backend), filtro por
  estado (reinicia la página a 0 al cambiar), paginación, botón
  "Actualizar" (refresco manual, sin polling/WebSocket), estados de
  loading/error/vacío, telemetría sin lectura mostrada como "Sin
  datos" nunca como 0. Ruta protegida `/ordenes`, enlace desde
  `WelcomePage`.

## Corrección de esta unidad

La opción de filtro `2 - En carga` se corrige a `2 - Tara registrada`:
el estado 2 también incluye órdenes que ya registraron tara y esperan
la activación, no solo las que están efectivamente cargando. Cambio
de una línea en `OrdersListPage.tsx`, sin impacto en contrato ni
backend.

## Verificación realizada

- `npm run build` (`tsc -b && vite build`) y `npm run lint`: sin
  errores ni advertencias, con el cambio de etiqueta ya aplicado.
- **Verificación manual en navegador (realizada por el usuario,
  2026-10-23), contra backend y frontend reales:** tabla, filtro por
  estado, ordenamiento ascendente/descendente por columna, paginación,
  botón "Actualizar" sin perder la sesión, cambio de filtro de estado
  desde la página 2 que vuelve a la página 0/1, y "Sin datos" en las
  columnas de telemetría sin lectura — los 7 puntos del checklist,
  correctos. Esta es la prueba visual que las verificaciones
  anteriores (build/lint, Postman del lado del backend) no podían
  cubrir por sí solas.

## Pendiente / límites

- **No probado, no se marca como tal:** casos de error de red/
  servidor en esta pantalla, lista vacía (cero órdenes) y cualquier
  otro caso fuera del checklist anterior.
- Sin prueba automatizada de la cancelación de solicitudes en vuelo
  (`AbortController`): razonada por construcción, no ejercitada con
  una prueba que fuerce respuestas fuera de orden (ver checkpoint
  `2026-10-23-02`).
- TP32-TP35 quedan para unidades posteriores de F7.
