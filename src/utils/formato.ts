/**
 * Formateo compartido por la tabla de ordenes y el resumen de inicio
 * (TP31/TP32/TP33, F7) - una sola version de cada regla de
 * presentacion, no una copia por pantalla.
 */
export function formatearNumero(valor: number | null): string {
  return valor === null ? 'Sin datos' : valor.toLocaleString('es-AR')
}

export function formatearFecha(valor: string | null): string {
  return valor === null ? 'Sin datos' : new Date(valor).toLocaleString('es-AR')
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

/** Porcentaje con denominador explicito y sin division por cero. */
export function calcularPorcentaje(cantidad: number, total: number): number {
  if (total <= 0) {
    return 0
  }
  return Math.round((cantidad / total) * 1000) / 10
}
