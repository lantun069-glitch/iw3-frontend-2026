# Contrato — Alarmas desde la UI (F7, TP34)

Cubre solo la parte de frontend de TP34: visualizar y aceptar alarmas
de temperatura desde la UI. Reutiliza
`GET /api/v1/orders/{orderNumber}/alarmas` y
`POST /api/v1/orders/{orderNumber}/alarmas/{idAlarma}/aceptacion`
(TP28/TP29, F6) sin ningún cambio de backend, contrato ni permisos.

## Preparación del entorno de prueba (sin correos reales)

- Se restableció el backend (estaba corriendo sin `SMTP_HOST`/
  `SMTP_PORT`, lo que hacía caer al default de `application.properties`
  — **`smtp.gmail.com`**, un proveedor real, no un `.invalid`) con
  `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_AUTH=false`,
  `SMTP_STARTTLS=false`, apuntando al receptor versionado
  `tools/smtp_test_catcher.py` (iniciado antes de cualquier prueba).
  Confirmado en el entorno del proceso ya corriendo, no asumido.
- Umbral vigente consultado (no asumido): `GET /api/v1/alarmas/configuracion`
  → `umbralTemperaturaC=33.00`, `destinatarios=alertas@local.invalid`.
  **Sin modificar la configuración global.**
- Orden propia de prueba `500321003` (recepción → tara → activación →
  dos lecturas sobre el umbral: 35.50 °C y 36.00 °C) — dos alarmas
  reales, confirmadas en `tools/smtp-received.log` (correo recibido
  por el receptor local, nunca salió de la máquina). Alarma `id=11`
  aceptada con observación de prueba (verifica el flujo de aceptación
  real); alarma `id=12` queda **pendiente a propósito**, para la
  revisión visual.

## Hallazgo de backend informado (sin cambio de código)

`AlarmaResponse.fechaDisparo`/`fechaAceptacion` son `LocalDateTime`
**sin offset** (a diferencia de `OrdenResumenResponse`, corregido en
TP32/TP33) — confirmado contra la API real, no asumido:
`"fechaDisparo":"2026-10-23T14:18:03.6111"`. Interpretarlo con
`new Date(...)` directo asumiría la zona del navegador, igual bug que
se corrigió para `Orden`. **No es bloqueante**: el frontend aplica el
mismo criterio horario ya acordado agregando el offset fijo de
`ZONA_RECEPCION` (`-03:00`, sin horario de verano) antes de parsear
(`formatearFechaAlarma`, `utils/formato.ts`). Recomendación para una
unidad de backend futura, no hecha ahora: alinear `AlarmaResponse` al
mismo patrón que `OrdenResumenResponse`.

## Qué hace

- `ordersApi.ts`: `obtenerAlarmas`/`aceptarAlarma` (nuevo, sin
  endpoint nuevo). `aceptarAlarma` nunca envía usuario ni fecha — los
  determina el servidor; si la observación está vacía, manda `{}` en
  vez de `{observacion: ""}`.
- `utils/formato.ts`: `formatearFechaAlarma` (ver hallazgo arriba).
- `AlarmasPage.tsx`/`.css` (nuevo), ruta `/ordenes/:orderNumber/alarmas`
  (disponible para cualquier estado de la orden, a diferencia de
  conciliación): secciones "Pendientes"/"Aceptadas"; cada pendiente
  tiene un textarea de observación (opcional, `maxLength=500`) y un
  botón "Aceptar" que se deshabilita solo mientras esa alarma puntual
  está en vuelo (no toda la pantalla); al aceptar, la alarma se mueve
  a "Aceptadas" usando la respuesta del servidor, sin un segundo GET.
  Si falla la aceptación, el texto de la observación **se conserva**
  (no se limpia el estado). Ante 409 (ya aceptada, ej. por otro
  usuario), se informa con un aviso y se recarga toda la lista con el
  mismo GET — no existe un GET individual por alarma. 403 se muestra
  como "No tiene permiso para esta operación", sin cerrar la sesión
  (eso lo decide el interceptor global solo ante 401, sin cambios).
  Estados de carga/error/vacío; limpieza del resultado anterior al
  cambiar de orden (mismo patrón que `ConciliacionPage`).
- `OrdersListPage.tsx`: columna "Alarmas" con link en **todas** las
  filas (sin restricción de estado); "volver" conserva filtro/página/
  orden, igual patrón que conciliación.

## Verificación realizada

- `npm run build` (`tsc -b && vite build`) y `npm run lint`: sin
  errores ni advertencias.
- Verificación real contra el backend (no mockeado): alarma creada y
  aceptada con observación (200, incluye usuario/fecha fijados por el
  servidor); reintento de aceptación → 409 con el mensaje esperado;
  usuario sin rol → 403 (no 401, no desloguea). Correo verificado en
  el receptor local, nunca un destinatario real.

## Evidencia manual del usuario (2026-10-23)

Confirmado en navegador real contra el backend real: orden `900001`
sin alarmas → "Esta orden no tiene alarmas de temperatura
registradas."; en la orden `500321003`, la alarma de 36 °C (`id=12`)
pasó a "Aceptadas" con usuario real y "Sin observación" (observación
vacía), quedando "Pendientes" en cero (`"Sin alarmas pendientes."`).

## Corrección de formato de fecha/hora (esta entrada)

El usuario reportó `fechaAceptacion` mostrada como "23/10/2026,
02:29:44" para una aceptación real de las ~14:29. **Diagnóstico, no
asumido:** se contrastó el valor crudo de la API
(`"2026-10-23T14:29:44.08084"`) contra la hora real del servidor en
ese momento (`14:29`/`14:30`) - coinciden. `new
Date(valor + "-03:00").toISOString()` da `...T17:29:44.080Z`, que es
exactamente `14:29:44 -03:00` - **la interpretación de zona horaria
ya era correcta**, no se compensó sumando ni restando horas. El
problema es que `toLocaleString('es-AR')` sin opciones usa 12 horas
**sin mostrar am/pm** (confirmado en Node 18.19.1 y en el Node 22.23.4
fijado del proyecto, misma salida: `"23/10/2026, 02:29:44"` para las
14:29) - un defecto de presentación del locale, no de la fecha ni de
la zona. Corregido con `hourCycle: 'h23'` (no `hour12: false`: ese da
`"24:05:00"` a la medianoche en es-AR) - ahora **siempre 24 horas
explícitas**, aplicado de forma consistente en las tres funciones de
fecha/hora de la UI (`formatearFecha`, `formatearFechaAlarma`, y el
"Actualizado:" del inicio vía la nueva `formatearFechaHora`), no solo
en la pantalla de alarmas.

## Evidencia manual del usuario — validación final (2026-10-23)

Confirmado en navegador real contra el backend real: formato horario
corregido verificado (disparo `14:18:48`, aceptación `14:29:44`,
ambos en 24 horas explícitas, coinciden con la hora real); "Volver a
órdenes" desde Alarmas conserva el filtro.

**TP34 queda verificado para el alcance probado.**

## Límites aceptados (no ocultos)

- Página y ordenamiento al volver desde Alarmas **no se confirmaron**
  en esta prueba (solo el filtro).
- Doble envío (botón deshabilitado mientras una aceptación está en
  vuelo) y conservación del texto de observación ante un error no se
  reconfirmaron visualmente en esta ronda final (sí se implementaron
  y se razonaron por construcción; 409/403 se verificaron por API en
  una ronda anterior, no en navegador en esta última).
- `AlarmaResponse.fechaDisparo`/`fechaAceptacion` siguen sin offset
  explícito en el backend (a diferencia de `OrdenResumenResponse`,
  corregido en TP32/TP33). El frontend agrega el offset fijo
  `-03:00` de `ZONA_RECEPCION` antes de interpretarlas
  (`formatearFechaAlarma`) - **decisión conservada tal cual**, no un
  cambio de backend pendiente ni algo a "arreglar" ahora.
- Sin framework de pruebas automatizadas de UI instalado; la
  verificación de esta unidad es manual, no automatizada.

F7 sigue abierta y **no se cierra en esta entrada**: con TP31-TP35
verificados para su alcance probado, queda pendiente la revisión
visual general del rediseño del frontend que no es parte de esos
requisitos (header en mobile, login, estados de carga/error/vacío del
inicio, panel de pendientes, tabla de recientes, tabla de órdenes
angosta - ver checkpoints anteriores) y los límites de esta misma
lista.
