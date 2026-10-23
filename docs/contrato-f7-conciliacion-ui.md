# Contrato — Conciliación desde la UI (F7, TP35)

Cubre solo la parte de frontend de TP35: consultar la conciliación de
una orden finalizada desde la UI. Reutiliza
`GET /api/v1/orders/{orderNumber}/conciliacion` (TP16-TP19, F4/F6) sin
ningún cambio de backend, contrato ni permisos.

## Fuente y alcance

- **CONFIRMADO (T2, cita ya registrada en `docs/requisitos.md`,
  `iw3-backend-sanitized`):** *"la visualización de conciliaciones,
  disponible solo para orden en el estado 4, que son las
  finalizadas."* No hizo falta NotebookLM: la cita ya estaba
  registrada y es suficiente para esta unidad.
- El backend ya valida el estado 4 de forma independiente de la UI
  (404 si la orden no existe, 409 si no está en estado 4) — la UI
  solo oculta el acceso, no reemplaza esa validación.

## Qué hace

- `ordersApi.ts`: `obtenerConciliacion(orderNumber)` (nuevo, sin
  endpoint nuevo).
- `utils/formato.ts`: `formatearPesoKg`/`formatearTemperaturaC`/
  `formatearDensidad`/`formatearCaudalKgH` (formato numérico español:
  punto de miles, coma decimal, decimales fijos según la precisión
  real de cada columna - un número JSON no conserva la escala de un
  `BigDecimal`) y `formatearDiferenciaKg` (signo explícito, nunca
  oculto; presentación neutral, una diferencia ≠ 0 no es un rechazo
  automático - no hay tolerancia exigida por la fuente). `Densidad`
  nunca se etiqueta "adimensional" ni se le inventa una unidad - sigue
  como DATO FALTANTE (ver `docs/fuentes.md` del backend).
- `ConciliacionPage.tsx`/`.css` (nuevo), ruta
  `/ordenes/:orderNumber/conciliacion`: encabezado (número de orden +
  badge "Finalizada", reutiliza `EstadoBadge`) + "Volver a órdenes";
  resumen destacado (neto por balanza, producto cargado, diferencia);
  desglose "Peso bruto − Tara = Neto" con los valores recibidos; tabla
  comparativa "Última lectura" vs. "Promedio del histórico"
  (temperatura/densidad/caudal), con la aclaración de que el promedio
  es sobre las muestras almacenadas, no sobre todas las lecturas
  recibidas - distinción ya establecida en TP32/TP33, aplicada acá.
  Cualquier campo null se muestra "Sin datos", nunca 0.
- `OrdersListPage.tsx`: columna "Conciliación" con link solo en filas
  en estado 4; ahora también lee `page`/`sort` de la URL (antes solo
  `estado`) para que "Volver a órdenes" reconstruya el listado exacto
  vía el estado de navegación del `Link` (`state.volver`).
- Ancho completo (igual margen lateral que `OrdersListPage`, sin la
  columna angosta de una versión anterior de esta unidad).

## Corrección de espaciado (esta entrada)

Los bloques se tocaban entre sí porque varias reglas usaban
`var(--space-5)`, un token **inexistente** en `index.css` (los
definidos son `--space-1/2/3/4/6/8`) - una variable CSS indefinida
sin fallback invalida toda la declaración, dejando el margen en 0 en
vez de fallar visiblemente. Se corrigió a `var(--space-6)` (24px) en
los tres puntos afectados (encabezado→resumen, resumen→desglose,
desglose→telemetría), dejando una separación consistente. Se agregó
también `text-align: right` a los encabezados numéricos de la tabla
comparativa (antes quedaban a la izquierda mientras sus valores ya
estaban a la derecha).

**Corrección adicional (entrada siguiente):** el mismo token inválido
`--space-5` también aparecía en `WelcomePage.css` (tres reglas) -
corregido a `var(--space-6)`, igual criterio que en esta pantalla. Sin
referencias a `--space-5` restantes en todo el proyecto.

## Corrección del badge "Finalizada" (revisión visual del usuario)

El badge de estado se mostraba siempre en el encabezado, incluso
cuando la consulta todavía estaba cargando o terminaba en error (ej.
orden `500321001`, en estado 2: mostraba "Finalizada" sin tener
ninguna conciliación que mostrar). Corregido: el badge solo se
renderiza cuando `conciliacion` tiene datos y no hay error
(`conciliacion && !error`) - oculto durante la carga y ante cualquier
error (404/409/otros). También se limpia `conciliacion` al inicio de
cada consulta nueva (antes de pedir los datos de la orden actual),
para no mostrar residualmente el resultado de una orden anterior
mientras carga o si la nueva falla.

**Mensaje 409 simplificado**, a pedido del usuario: `"La orden
{orderNumber} no está finalizada; la conciliación solo está
disponible para órdenes en estado 4."`

## Evidencia manual del usuario (2026-10-23)

Confirmado por el usuario: "Volver a órdenes" conserva el filtro, la
página y el ordenamiento con los que se llegó a la conciliación — no
se repitió la prueba en esta entrada, se registra el resultado ya
confirmado. También reportó el bug del badge "Finalizada" sobre la
orden `500321001` (estado 2) y el formato correcto de la diferencia
negativa en la orden `633433063` (−100,000 kg, presentación neutral).

## Verificación realizada

- `npm run build` (`tsc -b && vite build`) y `npm run lint`: sin
  errores ni advertencias, en ambas entradas.
- Verificación real de solo lectura contra el backend (sin alterar
  datos): orden `633433063` (estado 4) → 200, `diferenciaKg=-100.000`
  (coincide con lo reportado); orden `500321001` (estado 2, reusada de
  TP32/TP33) → 409 con el mensaje nuevo; una orden inexistente → 404.
  No se repitió ninguna batería previa.

## Evidencia manual del usuario — validación final (2026-10-23)

Confirmado en navegador real contra el backend real: orden
`500321001` (estado 2) muestra el mensaje de no finalizada, **sin
badge "Finalizada" ni datos de conciliación** (confirma la corrección
del badge y la limpieza de resultados residuales); valores
positivos y negativos con formato numérico español correcto
(`633433063` → `-100,000 kg`, `915358` → `+80,000 kg`); "Últimos
valores" y "Promedios" claramente diferenciados; espaciado y
alineación corregidos; "Volver a órdenes" conserva filtro/página/
orden.

**TP35 queda verificado para el alcance probado.**

## Límites aceptados (no ocultos)

- El 404 (orden inexistente) solo se verificó por API (`curl`), no
  visualmente en un navegador.
- Promedios `null` (orden sin ningún detalle almacenado) no se
  ejercitó — inalcanzable por el circuito normal (toda orden que
  llega a estado 3/4 ya tiene al menos una lectura aceptada, que
  genera detalle).
- Sin framework de pruebas automatizadas de UI instalado; la
  verificación de esta unidad es manual, no automatizada.

F7 sigue abierta: falta TP34 (alarmas desde UI) y la revisión visual
general del rediseño del frontend que no es parte de TP31-TP35 (ver
checkpoints anteriores).
