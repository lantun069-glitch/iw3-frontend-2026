import { httpClient } from './httpClient'
import { ESTADOS } from '../domain/estados'

/**
 * Fila del listado de ordenes (TP31, F7). Coincide con
 * OrdenResumenResponse del backend: nunca trae claveActivacion ni las
 * entidades completas de camion/chofer/cliente/producto, solo
 * patenteCamion. Los campos de telemetria son null si la orden
 * todavia no tiene ninguna lectura aceptada - el backend nunca manda
 * 0 en ese caso (ver OrdersListPage, que los muestra como "Sin datos").
 *
 * fechaUltimaLectura y fechaInicioCarga (TP32/TP33, F7) son String
 * ISO-8601 CON offset explicito del backend (ej.
 * "2026-10-23T10:15:30-03:00"), nunca una hora sin zona - `new
 * Date(...)` las interpreta correctamente sin asumir la zona del
 * navegador. fechaInicioCarga es null hasta la primera lectura
 * aceptada. etaMinutos es null para "no estimable" (sin datos o
 * caudal <= 0) y tambien para ordenes que no estan en estado 2 (el
 * backend solo lo calcula ahi, ver docs/contrato-f7-tiempos-carga.md).
 */
export interface OrdenResumen {
  orderNumber: number
  estado: number
  patenteCamion: string
  presetKg: number
  masaAcumuladaKg: number | null
  ultimaTemperaturaC: number | null
  ultimaDensidad: number | null
  ultimoCaudalKgH: number | null
  fechaUltimaLectura: string | null
  fechaInicioCarga: string | null
  etaMinutos: number | null
}

export interface OrdenListado {
  content: OrdenResumen[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ListarOrdenesParams {
  estado?: number
  page?: number
  size?: number
  sort?: string
}

/**
 * GET /api/v1/orders (backend, F7). estado/page/size/sort son todos
 * opcionales - omitidos, el backend aplica sus propios defaults
 * (sin filtro, page=0, size=20, sort=orderNumber,asc). signal permite
 * cancelar una solicitud en vuelo (ver OrdersListPage: evita que una
 * respuesta vieja pise el resultado de una busqueda mas reciente).
 */
export async function listarOrdenes(
  params: ListarOrdenesParams,
  signal?: AbortSignal,
): Promise<OrdenListado> {
  const response = await httpClient.get<OrdenListado>('/api/v1/orders', {
    params,
    signal,
  })
  return response.data
}

export interface ResumenEstados {
  total: number
  porEstado: Record<number, number>
}

/**
 * Resumen para el inicio (total y cantidad por estado): reutiliza
 * GET /api/v1/orders con size=1 y lee totalElements de cada respuesta
 * - nunca cuenta content.length (una sola pagina) ni descarga todas
 * las ordenes. Si cualquiera de las 5 solicitudes falla, la promesa
 * entera rechaza (todo o nada): el llamador no debe completar el
 * resumen con ceros a partir de una consulta fallida.
 */
export async function obtenerResumenEstados(signal?: AbortSignal): Promise<ResumenEstados> {
  const [totalResp, ...porEstadoResp] = await Promise.all([
    listarOrdenes({ page: 0, size: 1 }, signal),
    ...ESTADOS.map((estado) => listarOrdenes({ estado, page: 0, size: 1 }, signal)),
  ])

  const porEstado: Record<number, number> = {}
  ESTADOS.forEach((estado, indice) => {
    porEstado[estado] = porEstadoResp[indice].totalElements
  })

  return { total: totalResp.totalElements, porEstado }
}

/**
 * Conciliacion de una orden finalizada (TP35, F7). Coincide con
 * ConciliacionResponse del backend. ultimaTemperaturaC/ultimaDensidad/
 * ultimoCaudalKgH son el ULTIMO VALOR del snapshot (no un promedio);
 * promedioTemperaturaC/promedioDensidad/promedioCaudalKgH son el
 * promedio sobre el detalle ALMACENADO de la orden - distintos
 * conceptos, nunca mostrar uno como si fuera el otro. Cualquier campo
 * puede ser null (ver docs/contrato-f7-conciliacion-ui.md): se
 * muestra "Sin datos", nunca 0. densidad/ultimaDensidad/
 * promedioDensidad no tienen unidad confirmada - no se etiqueta como
 * "adimensional" ni se inventa una (ver docs/fuentes.md, DATO
 * FALTANTE).
 */
export interface ConciliacionOrden {
  orderNumber: number
  taraKg: number | null
  pesoBrutoKg: number | null
  netoKg: number | null
  productoCargadoKg: number | null
  diferenciaKg: number | null
  ultimaTemperaturaC: number | null
  ultimaDensidad: number | null
  ultimoCaudalKgH: number | null
  promedioTemperaturaC: number | null
  promedioDensidad: number | null
  promedioCaudalKgH: number | null
}

/**
 * GET /api/v1/orders/{orderNumber}/conciliacion (backend, F4/F6, sin
 * cambios para esta unidad). Solo responde 200 si la orden existe y
 * esta en estado 4 - 404/409 se propagan para que el llamador los
 * distinga explicitamente (ver ConciliacionPage).
 */
export async function obtenerConciliacion(orderNumber: number, signal?: AbortSignal): Promise<ConciliacionOrden> {
  const response = await httpClient.get<ConciliacionOrden>(`/api/v1/orders/${orderNumber}/conciliacion`, { signal })
  return response.data
}

/**
 * Ordenes con lectura mas reciente, para el inicio. Reutiliza
 * GET /api/v1/orders con sort=fechaUltimaLectura,desc (mismo campo
 * ordenable que ya valida/expone TP31, no hay endpoint nuevo) y
 * size=limite - no descarga todas las ordenes ni usa una pagina
 * arbitraria.
 *
 * Verificado contra el backend real (2026-10-23, usuario con
 * ROLE_OPERADOR, 87 ordenes de prueba): en MySQL, ORDER BY ... DESC
 * deja los valores NULL al final (y ASC los deja primero) - sort=
 * fechaUltimaLectura,desc con size=5 devolvio las 5 fechas reales mas
 * recientes en orden estrictamente descendente, sin ninguna fila con
 * fechaUltimaLectura null entre ellas. El filtro de abajo es una
 * salvaguarda explicita para el caso con menos de `limite` ordenes
 * con lectura (ahi si podrian aparecer filas null al final de esa
 * pagina chica) - no es necesario para excluir filas intercaladas,
 * pero igual se excluyen por claridad del contrato de esta funcion.
 */
export async function obtenerOrdenesRecientes(limite: number, signal?: AbortSignal): Promise<OrdenResumen[]> {
  const listado = await listarOrdenes({ size: limite, sort: 'fechaUltimaLectura,desc' }, signal)
  return listado.content.filter((orden) => orden.fechaUltimaLectura !== null)
}
