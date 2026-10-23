import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarOrdenes, type OrdenResumen } from '../api/ordersApi'
import { EstadoBadge } from '../components/EstadoBadge'
import { ESTADO_LABELS } from '../domain/estados'
import { formatearEta, formatearFecha, formatearNumero, formatearTranscurrido } from '../utils/formato'
import './OrdersListPage.css'

/**
 * Campos de ordenamiento admitidos (TP31, F7): misma lista cerrada
 * que CAMPOS_ORDENABLES en OrdenBusiness.listarOrdenes del backend -
 * un valor fuera de esta lista ya no llega a pedirse, pero el backend
 * la vuelve a validar igual (nunca confiar solo en el cliente).
 */
const CAMPOS_ORDENABLES: { campo: string; etiqueta: string }[] = [
  { campo: 'orderNumber', etiqueta: 'Orden' },
  { campo: 'estado', etiqueta: 'Estado' },
  { campo: 'presetKg', etiqueta: 'Preset (kg)' },
  { campo: 'masaAcumuladaKg', etiqueta: 'Masa acumulada (kg)' },
  { campo: 'fechaUltimaLectura', etiqueta: 'Última lectura' },
]

const SIZE_DEFAULT = 20

type Direccion = 'asc' | 'desc'

/**
 * Listado de ordenes para monitoreo (TP31, F7): filtro por estado,
 * ordenamiento por columnas permitidas, paginación y actualización
 * manual (decisión del equipo: sin polling ni WebSocket en esta
 * unidad, ver docs/contrato-f7-monitoreo-ordenes.md). Patente y
 * preset mostrados en la tabla son decisión del equipo, no una
 * exigencia textual de la fuente (que quedó ambigua en ese punto,
 * ver el contrato).
 */
export function OrdersListPage() {
  // El filtro inicial puede llegar por la URL (ej. desde una tarjeta o
  // barra del inicio, "/ordenes?estado=2"): se lee una sola vez al
  // montar, como valor inicial del filtro - no se vuelve a sincronizar
  // con la URL despues (misma simplicidad que el resto del filtro).
  const [searchParams] = useSearchParams()
  const [estadoFiltro, setEstadoFiltro] = useState<string>(() => {
    const desdeUrl = searchParams.get('estado')
    return desdeUrl !== null && desdeUrl in ESTADO_LABELS ? desdeUrl : ''
  })
  const [page, setPage] = useState(0)
  const [sortCampo, setSortCampo] = useState('orderNumber')
  const [sortDireccion, setSortDireccion] = useState<Direccion>('asc')

  const [content, setContent] = useState<OrdenResumen[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  // TP33: tick de 1 segundo solo para forzar el re-render del contador
  // de tiempo transcurrido (formatearTranscurrido calcula contra
  // Date.now() en cada render). No dispara ninguna solicitud de red ni
  // modifica el contenido de la tabla.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const cargar = useCallback(() => {
    // Cancela la solicitud anterior si todavia esta en vuelo: evita
    // que una respuesta vieja (de un filtro/pagina/orden previo) pise
    // el resultado de una busqueda mas reciente.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const estado = estadoFiltro === '' ? undefined : Number(estadoFiltro)
    listarOrdenes(
      { estado, page, size: SIZE_DEFAULT, sort: `${sortCampo},${sortDireccion}` },
      controller.signal,
    )
      .then((listado) => {
        setContent(listado.content)
        setTotalPages(listado.totalPages)
        setTotalElements(listado.totalElements)
      })
      .catch((err) => {
        if (axios.isCancel(err)) {
          return
        }
        setError(mensajeDeError(err))
      })
      .finally(() => {
        if (abortRef.current === controller) {
          setLoading(false)
        }
      })
  }, [estadoFiltro, page, sortCampo, sortDireccion])

  useEffect(() => {
    cargar()
    return () => abortRef.current?.abort()
  }, [cargar])

  function handleEstadoChange(nuevoEstado: string) {
    setEstadoFiltro(nuevoEstado)
    setPage(0) // cambiar el filtro reinicia la pagina
  }

  function handleOrdenarPor(campo: string) {
    if (campo === sortCampo) {
      setSortDireccion((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCampo(campo)
      setSortDireccion('asc')
    }
    setPage(0)
  }

  return (
    <main className="orders-list-page" id="contenido">
      <h1>Órdenes</h1>

      <div className="orders-toolbar">
        <div className="orders-filtro">
          <label htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" value={estadoFiltro} onChange={(e) => handleEstadoChange(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(ESTADO_LABELS).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {valor} - {etiqueta}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn btn-secondary" onClick={cargar} disabled={loading}>
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>

        <span className="visually-hidden" role="status" aria-live="polite">
          {loading ? 'Actualizando la lista de órdenes…' : ''}
        </span>
      </div>

      {error && (
        <p className="orders-error" role="alert">
          {error}
        </p>
      )}

      {!error && !loading && content.length === 0 && (
        <p className="orders-empty">No hay órdenes para mostrar.</p>
      )}

      {content.length > 0 && (
        <div className="orders-table-wrap" aria-busy={loading}>
          <table className="orders-table">
            <caption className="visually-hidden">Listado de órdenes de carga, paginado y filtrable</caption>
            <thead>
              <tr>
                {CAMPOS_ORDENABLES.map(({ campo, etiqueta }) => (
                  <th key={campo} aria-sort={sortCampo === campo ? (sortDireccion === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="orders-sort-button" onClick={() => handleOrdenarPor(campo)}>
                      {etiqueta}
                      {sortCampo === campo ? (sortDireccion === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  </th>
                ))}
                <th>Patente</th>
                <th>Temperatura (°C)</th>
                <th>Densidad</th>
                <th>Caudal (kg/h)</th>
                <th>Tiempo transcurrido</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {content.map((orden) => (
                <tr key={orden.orderNumber}>
                  <td>{orden.orderNumber}</td>
                  <td>
                    <EstadoBadge estado={orden.estado} />
                  </td>
                  <td className="num">{formatearNumero(orden.presetKg)}</td>
                  <td className="num">{formatearNumero(orden.masaAcumuladaKg)}</td>
                  <td>{formatearFecha(orden.fechaUltimaLectura)}</td>
                  <td>{orden.patenteCamion}</td>
                  <td className="num">{formatearNumero(orden.ultimaTemperaturaC)}</td>
                  <td className="num">{formatearNumero(orden.ultimaDensidad)}</td>
                  <td className="num">{formatearNumero(orden.ultimoCaudalKgH)}</td>
                  <td className="num">{formatearTranscurrido(orden.estado, orden.fechaInicioCarga)}</td>
                  <td className="num">{formatearEta(orden.estado, orden.etaMinutos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {content.length > 0 && <p className="orders-nota-eta">Estimación según última lectura; actualización manual.</p>}

      {totalPages > 0 && (
        <div className="orders-pagination">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setPage((p) => p - 1)}
            disabled={loading || page <= 0}
          >
            Anterior
          </button>
          <span className="orders-pagination-info">
            Página {page + 1} de {totalPages} ({totalElements} órdenes)
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setPage((p) => p + 1)}
            disabled={loading || page + 1 >= totalPages}
          >
            Siguiente
          </button>
        </div>
      )}
    </main>
  )
}

function mensajeDeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 400) {
      return `Parámetro de consulta inválido: ${String(err.response.data && (err.response.data as { message?: string }).message)}`
    }
    if (!err.response) {
      return 'No se pudo conectar con el servidor.'
    }
    return `Error al consultar las órdenes (código ${err.response.status}).`
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Error desconocido al consultar las órdenes.'
}
