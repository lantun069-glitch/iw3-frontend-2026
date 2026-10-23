import { ESTADO_LABELS } from '../domain/estados'

/**
 * Etiqueta de estado compartida (tabla de ordenes e inicio): mismo
 * texto/color en toda la app, nunca "Cargando" para el estado 2 (ver
 * docs/contrato-f7-monitoreo-ordenes.md - el estado 2 cubre tara
 * registrada en espera de activacion, no solo carga en curso).
 */
export function EstadoBadge({ estado }: { estado: number }) {
  return <span className={`badge-estado badge-estado-${estado}`}>{ESTADO_LABELS[estado] ?? estado}</span>
}
