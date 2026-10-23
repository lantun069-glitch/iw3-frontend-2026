/**
 * Fuente unica de los 4 estados de una orden para toda la UI (tabla,
 * filtro, resumen de inicio y grafico): mismo numero, etiqueta y
 * color en todos lados. No agrega ningun estado nuevo - son los
 * mismos 1-4 que ya valida el backend (OrdenBusiness.listarOrdenes).
 */
export const ESTADOS = [1, 2, 3, 4] as const

export const ESTADO_LABELS: Record<number, string> = {
  1: 'Recibida',
  2: 'Tara registrada',
  3: 'Cerrada',
  4: 'Finalizada',
}

/** Mismo color que el texto de cada .badge-estado-N en index.css - se
 * duplica aca como valor hex porque el grafico (recharts) necesita un
 * color real para el relleno de cada barra, no puede leer una clase
 * CSS. Si se cambia un color, cambiar los dos lugares. */
export const ESTADO_COLORS: Record<number, string> = {
  1: '#475467',
  2: '#1d4ed8',
  3: '#9a6400',
  4: '#1a7f45',
}
