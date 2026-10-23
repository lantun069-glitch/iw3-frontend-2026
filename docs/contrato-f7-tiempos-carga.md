# Contrato — ETA y tiempo transcurrido (F7, TP32/TP33, frontend)

Cubre la parte de frontend de TP32 (ETA) y TP33 (tiempo transcurrido),
sobre el mismo listado de TP31 (`GET /api/v1/orders`, sin endpoint
nuevo). No cubre TP34 (alarmas) ni TP35 (conciliación).

Separación fuente docente / decisión del equipo (detalle completo en
`iw3-backend-sanitized`, `docs/requisitos.md` y
`docs/contrato-f7-tiempos-carga.md`, verificado contra NotebookLM
2026-10-23): T2 confirma que el tiempo transcurrido se muestra **solo
en estado 2**, pero **no dice lo mismo explícitamente para el ETA**
(se extiende por decisión del equipo, no por exigencia textual); T2
tampoco da la fórmula del ETA, el formato del contador, ni qué hacer
con caudal cero/negativo o con más de 24 h acumuladas — todo eso es
interpretación/decisión del equipo.

## Qué hace

- `OrdenResumen` (`src/api/ordersApi.ts`) agrega `fechaInicioCarga:
  string | null` y `etaMinutos: number | null`. Ambas fechas que
  expone el backend (`fechaInicioCarga`/`fechaUltimaLectura`) ahora
  llegan como ISO-8601 **con offset explícito** (ej.
  `"2026-10-23T10:15:30-03:00"`) — `new Date(...)` las interpreta sin
  asumir la zona del navegador.
- `OrdersListPage.tsx`:
  - `formatearTranscurrido(estado, fechaInicioCarga)`: "—" fuera de
    estado 2; "Sin iniciar" si `fechaInicioCarga` es null; si no,
    `HH:mm:ss` con horas acumuladas sin reiniciar a las 24 h,
    calculado contra `Date.now()` en cada render.
  - `formatearEta(estado, etaMinutos)`: "—" fuera de estado 2; "No
    estimable" si `etaMinutos` es null; si no, el valor ya calculado
    por el backend con 2 decimales fijos (`toFixed(2)`, porque un
    número JSON no conserva la escala de un `BigDecimal` — "120.00"
    puede llegar como el número `120`).
  - Tick de 1 segundo (`setInterval` en un `useEffect`, con
    `clearInterval` en su cleanup al desmontar) **solo** para forzar
    el re-render del contador — nunca dispara una solicitud de red ni
    modifica `content`. El ETA nunca se descuenta con el reloj ni se
    recalcula en el cliente: es el valor que mandó el backend en la
    última respuesta, hasta el próximo "Actualizar".
  - Dos columnas nuevas en la tabla ("Tiempo transcurrido", "ETA"),
    sin agregarlas a `CAMPOS_ORDENABLES` (no son ordenables, el
    backend tampoco las ofrece para `sort`).
  - Nota fija debajo de la tabla: "Estimación según última lectura;
    actualización manual." — sin umbral de obsolescencia inventado;
    la columna "Última lectura" (ya existía, TP31) sigue mostrando la
    fecha real.

## Verificación realizada en esta unidad

- `npm run build` (`tsc -b && vite build`) y `npm run lint`: sin
  errores ni advertencias.
- Verificación aislada con Node 22.23.4 (fuera de la app, sin backend
  corriendo): `new Date(...)` interpreta correctamente los strings con
  offset de 6 dígitos de fracción de segundo que produce el backend,
  con y sin fracción, aplicando el offset `-03:00` como corresponde.

## Evidencia manual del usuario (2026-10-23)

Confirmado en navegador real contra el backend real: el contador
avanza segundo a segundo, y una captura mostró `HH:mm:ss` con horas
acumuladas **superiores a 24** sin reiniciar (reconfirmado en una
entrada posterior de la misma sesión). También se confirmó que el
valor de ETA permanece **fijo** mientras el contador sigue avanzando
- el tick de 1 segundo nunca lo recalcula ni lo descuenta, solo
cambia al volver a consultar el backend. Tres comportamientos
puntuales confirmados — **no equivale a verificar el resto de
TP32/TP33**, que sigue pendiente (ver abajo).

## Pendiente explícito

- **Sin framework de pruebas automatizadas de UI** (`package.json` no
  tiene Vitest/Jest/Testing Library): no se incorporó uno para esta
  unidad puntual, por instrucción explícita de no agregar
  funcionalidades nuevas fuera de alcance.
- Revisión visual conjunta con el usuario, contra el backend y
  frontend reales: estados 1/3/4 ocultando contador y ETA, "Sin
  iniciar" sin activación, "No estimable" sin datos/caudal ≤ 0, preset
  alcanzado sin cerrar la orden, y el offset interpretado
  correctamente en un navegador real (no solo en la verificación
  aislada con Node). No se marca TP32/TP33 como "verificado" hasta
  esa revisión completa.
