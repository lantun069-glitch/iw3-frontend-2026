import { httpClient } from './httpClient'

/**
 * Fila del listado de ordenes (TP31, F7). Coincide con
 * OrdenResumenResponse del backend: nunca trae claveActivacion ni las
 * entidades completas de camion/chofer/cliente/producto, solo
 * patenteCamion. Los campos de telemetria son null si la orden
 * todavia no tiene ninguna lectura aceptada - el backend nunca manda
 * 0 en ese caso (ver OrdersListPage, que los muestra como "Sin datos").
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
