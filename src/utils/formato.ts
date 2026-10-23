/**
 * Formateo compartido por la tabla de ordenes y el resumen de inicio
 * (TP31/TP32/TP33, F7) - una sola version de cada regla de
 * presentacion, no una copia por pantalla.
 */
export function formatearNumero(valor: number | null): string {
  return valor === null ? 'Sin datos' : valor.toLocaleString('es-AR')
}

/**
 * Hora explicita de 24 horas para toda fecha/hora mostrada en la UI.
 * `toLocaleString('es-AR')` SIN opciones usa 12 horas sin indicador
 * am/pm (confirmado con un valor real: "14:29:44" se mostraba
 * "02:29:44", no es un bug de interpretacion de zona horaria - el
 * dato ya llega/se interpreta correcto, toISOString lo confirma; es
 * un formato ambiguo del locale). `hour12:false` tampoco alcanza: en
 * es-AR da "24:05:00" a la medianoche. `hourCycle:'h23'` es el unico
 * que da siempre 00-23.
 */
const OPCIONES_FECHA_HORA: Intl.DateTimeFormatOptions = { hourCycle: 'h23' }

export function formatearFecha(valor: string | null): string {
  return valor === null ? 'Sin datos' : new Date(valor).toLocaleString('es-AR', OPCIONES_FECHA_HORA)
}

/**
 * TP34 (F7): formatea una fecha de AlarmaResponse (fechaDisparo/
 * fechaAceptacion), que a diferencia de OrdenResumenResponse llega
 * SIN offset (ver docs/contrato-f7-alarmas-ui.md - no se corrigió
 * como en TP32/TP33, limitación de backend informada, no corregida
 * en esta unidad). Se le agrega el offset fijo de la zona del
 * backend (America/Argentina/Cordoba, -03:00 todo el año, sin
 * horario de verano) antes de interpretarla - nunca se asume la zona
 * del navegador. Si el backend alguna vez empieza a mandar offset
 * propio, este agregado quedaria mal (doble offset) - ver el
 * contrato para la condicion de retiro de este workaround.
 */
export function formatearFechaAlarma(valor: string | null): string {
  if (valor === null) {
    return 'Sin datos'
  }
  const conOffset = /[+-]\d{2}:\d{2}$/.test(valor) ? valor : `${valor}-03:00`
  return new Date(conOffset).toLocaleString('es-AR', OPCIONES_FECHA_HORA)
}

/** Para fechas que ya son `Date` (ej. "Actualizado:" del inicio), mismo criterio de 24 horas explícitas que el resto de la UI. */
export function formatearFechaHora(valor: Date): string {
  return valor.toLocaleString('es-AR', OPCIONES_FECHA_HORA)
}

/**
 * TP33 (F7): tiempo transcurrido desde fechaInicioCarga, visible solo
 * en estado 2 (exigencia de la fuente, ver docs/contrato-f7-tiempos-carga.md).
 * Formato HH:mm:ss con horas acumuladas sin reiniciar a las 24 h
 * (decisión del equipo). Se recalcula contra Date.now() en cada
 * llamada - quien lo use debe volver a renderizar periodicamente (ver
 * el tick de 1 segundo en OrdersListPage/WelcomePage) - nunca simula
 * el avance de masa/caudal, que solo cambian al volver a consultar el
 * backend.
 */
export function formatearTranscurrido(estado: number, fechaInicioCarga: string | null): string {
  if (estado !== 2) {
    return '—'
  }
  if (fechaInicioCarga === null) {
    return 'Sin iniciar'
  }
  const segundosTotales = Math.max(0, Math.floor((Date.now() - new Date(fechaInicioCarga).getTime()) / 1000))
  const horas = Math.floor(segundosTotales / 3600)
  const minutos = Math.floor((segundosTotales % 3600) / 60)
  const segundos = segundosTotales % 60
  const dosDigitos = (n: number) => String(n).padStart(2, '0')
  return `${dosDigitos(horas)}:${dosDigitos(minutos)}:${dosDigitos(segundos)}`
}

/**
 * TP32 (F7): ETA ya calculado por el backend (OrdenBusiness.calcularEtaMinutos)
 * sobre el último snapshot - el frontend solo lo formatea, nunca lo
 * recalcula ni lo descuenta con el reloj local (ver
 * docs/contrato-f7-tiempos-carga.md). null fuera de estado 2, o "no
 * estimable" (sin datos / caudal <= 0) dentro de estado 2.
 */
export function formatearEta(estado: number, etaMinutos: number | null): string {
  if (estado !== 2) {
    return '—'
  }
  if (etaMinutos === null) {
    return 'No estimable'
  }
  return `${etaMinutos.toFixed(2)} min`
}

/**
 * TP35 (F7): formato numerico español (miles con punto, decimales con
 * coma, cantidad fija de decimales segun la precision DECIMAL de la
 * columna de origen - un numero JSON no conserva esa escala). Se usa
 * en toda la pantalla de conciliacion para no mezclar "80.000" (que
 * en es-AR se leeria como ochenta mil) con el formato real del dato.
 */
function formatearNumeroEs(valor: number | null, decimales: number): string {
  if (valor === null) {
    return 'Sin datos'
  }
  return valor.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

export function formatearPesoKg(valor: number | null): string {
  return valor === null ? 'Sin datos' : `${formatearNumeroEs(valor, 3)} kg`
}

export function formatearTemperaturaC(valor: number | null): string {
  return valor === null ? 'Sin datos' : `${formatearNumeroEs(valor, 2)} °C`
}

/** Sin unidad: no confirmada por la fuente, ver docs/fuentes.md (DATO FALTANTE). */
export function formatearDensidad(valor: number | null): string {
  return formatearNumeroEs(valor, 4)
}

export function formatearCaudalKgH(valor: number | null): string {
  return valor === null ? 'Sin datos' : `${formatearNumeroEs(valor, 3)} kg/h`
}

/**
 * TP35 (F7): diferencia de conciliacion con signo explicito y formato
 * numerico español (ver formatearNumeroEs) - nunca se oculta el signo
 * ni se redondea a un valor distinto al recibido. Presentacion
 * neutral: una diferencia != 0 no es un rechazo automatico (no hay
 * tolerancia exigida por la fuente).
 */
export function formatearDiferenciaKg(valor: number | null): string {
  if (valor === null) {
    return 'Sin datos'
  }
  const signo = valor < 0 ? '-' : valor > 0 ? '+' : ''
  return `${signo}${formatearNumeroEs(Math.abs(valor), 3)} kg`
}

/** Porcentaje con denominador explicito y sin division por cero. */
export function calcularPorcentaje(cantidad: number, total: number): number {
  if (total <= 0) {
    return 0
  }
  return Math.round((cantidad / total) * 1000) / 10
}
