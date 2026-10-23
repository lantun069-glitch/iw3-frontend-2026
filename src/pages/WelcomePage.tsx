import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { obtenerOrdenesRecientes, obtenerResumenEstados, type OrdenResumen, type ResumenEstados } from '../api/ordersApi'
import { EstadoBadge } from '../components/EstadoBadge'
import { ESTADOS, ESTADO_COLORS, ESTADO_LABELS } from '../domain/estados'
import { calcularPorcentaje, formatearEta, formatearFecha } from '../utils/formato'
import './WelcomePage.css'

const RECIENTES_LIMITE = 5

/**
 * Inicio (F7): resumen operativo real, con datos del backend
 * (totalElements de GET /api/v1/orders, nunca content.length ni una
 * descarga completa - ver obtenerResumenEstados/obtenerOrdenesRecientes
 * en ordersApi.ts). Actualizacion manual, igual criterio que el
 * listado de ordenes (sin polling). Sin panel de alarmas todavia -
 * queda para su propia unidad.
 */
export function WelcomePage() {
  const navigate = useNavigate()

  const [resumen, setResumen] = useState<ResumenEstados | null>(null)
  const [recientes, setRecientes] = useState<OrdenResumen[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const cargar = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    Promise.all([obtenerResumenEstados(controller.signal), obtenerOrdenesRecientes(RECIENTES_LIMITE, controller.signal)])
      .then(([resumenNuevo, recientesNuevo]) => {
        setResumen(resumenNuevo)
        setRecientes(recientesNuevo)
        setActualizadoEn(new Date())
      })
      .catch((err) => {
        if (axios.isCancel(err)) {
          return
        }
        // Una consulta fallida nunca completa el resumen con ceros: si
        // ya habia datos previos validos, se conservan en pantalla
        // (con el aviso de error arriba) en vez de borrarlos.
        setError(mensajeDeError(err))
      })
      .finally(() => {
        if (abortRef.current === controller) {
          setLoading(false)
        }
      })
  }, [])

  useEffect(() => {
    cargar()
    return () => abortRef.current?.abort()
  }, [cargar])

  const total = resumen?.total ?? 0
  const datos = ESTADOS.map((estado) => {
    const cantidad = resumen?.porEstado[estado] ?? 0
    const porcentaje = calcularPorcentaje(cantidad, total)
    return {
      estado,
      etiqueta: ESTADO_LABELS[estado],
      cantidad,
      porcentaje,
      etiquetaValor: `${cantidad} (${porcentaje}%)`,
    }
  })

  return (
    <main className="welcome-page" id="contenido">
      <div className="welcome-header">
        <h1>Resumen de órdenes</h1>
        <div className="welcome-actions">
          <button type="button" className="btn btn-secondary" onClick={cargar} disabled={loading}>
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
          {actualizadoEn && (
            <span className="welcome-actualizado">Actualizado: {actualizadoEn.toLocaleString('es-AR')}</span>
          )}
        </div>
      </div>

      {error && (
        <p className="state-error" role="alert">
          {error}
        </p>
      )}

      {!loading && resumen && resumen.total === 0 && <p className="state-empty">No hay órdenes registradas todavía.</p>}

      {resumen && resumen.total > 0 && (
        <>
          <div className="welcome-cards">
            <Link to="/ordenes" className="welcome-card">
              <span className="welcome-card-valor">{resumen.total}</span>
              <span className="welcome-card-etiqueta">Total</span>
            </Link>
            {datos.map(({ estado, etiqueta, cantidad }) => (
              <Link
                key={estado}
                to={`/ordenes?estado=${estado}`}
                className="welcome-card"
                style={{ borderTopColor: ESTADO_COLORS[estado] }}
              >
                <span className="welcome-card-valor" style={{ color: ESTADO_COLORS[estado] }}>
                  {cantidad}
                </span>
                <span className="welcome-card-etiqueta">{etiqueta}</span>
              </Link>
            ))}
          </div>

          <div className="welcome-middle">
            <section className="welcome-panel welcome-panel-chart">
              <h2>Órdenes por estado</h2>
              <p className="welcome-panel-sub">Porcentaje sobre el total de órdenes ({resumen.total}).</p>
              <div
                className="welcome-chart"
                role="img"
                aria-label={`Órdenes por estado: ${datos.map((d) => `${d.etiqueta}, ${d.cantidad} (${d.porcentaje}%)`).join('; ')}.`}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 68, bottom: 4, left: 4 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="etiqueta" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, _nombre, item) => [
                        `${value} de ${resumen.total} (${item.payload.porcentaje}%)`,
                        'Órdenes',
                      ]}
                      cursor={{ fill: 'var(--color-bg)' }}
                    />
                    <Bar
                      dataKey="cantidad"
                      radius={[0, 4, 4, 0]}
                      cursor="pointer"
                      // Se navega por indice sobre el mismo array "datos", no
                      // por el shape interno que recharts pasa al callback.
                      onClick={(_datoInterno, index) => navigate(`/ordenes?estado=${datos[index].estado}`)}
                    >
                      {datos.map((d) => (
                        <Cell key={d.estado} fill={ESTADO_COLORS[d.estado]} />
                      ))}
                      <LabelList dataKey="etiquetaValor" position="right" style={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="welcome-panel">
              <h2>Pendientes del circuito</h2>
              <ul className="welcome-pendientes">
                <li>
                  <Link to="/ordenes?estado=1" className="welcome-pendiente">
                    <span className="welcome-pendiente-valor">{resumen.porEstado[1]}</span>
                    <span className="welcome-pendiente-etiqueta">Recibidas pendientes de tara</span>
                  </Link>
                </li>
                <li>
                  <Link to="/ordenes?estado=3" className="welcome-pendiente">
                    <span className="welcome-pendiente-valor">{resumen.porEstado[3]}</span>
                    <span className="welcome-pendiente-etiqueta">Cerradas pendientes de pesaje final</span>
                  </Link>
                </li>
              </ul>
            </section>
          </div>

          <section className="welcome-panel">
            <h2>Lecturas más recientes</h2>
            {recientes.length === 0 ? (
              <p className="state-empty">Ninguna orden tiene lecturas registradas todavía.</p>
            ) : (
              <div className="welcome-recientes-wrap">
                <table className="welcome-recientes-table">
                  <caption className="visually-hidden">
                    Hasta {RECIENTES_LIMITE} órdenes con la lectura más reciente, de más nueva a más vieja
                  </caption>
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Patente</th>
                      <th>Estado</th>
                      <th>Última lectura</th>
                      <th>ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recientes.map((orden) => (
                      <tr key={orden.orderNumber}>
                        <td>
                          <Link to={`/ordenes?estado=${orden.estado}`}>{orden.orderNumber}</Link>
                        </td>
                        <td>{orden.patenteCamion}</td>
                        <td>
                          <EstadoBadge estado={orden.estado} />
                        </td>
                        <td>{formatearFecha(orden.fechaUltimaLectura)}</td>
                        <td>{formatearEta(orden.estado, orden.etaMinutos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function mensajeDeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return 'No se pudo conectar con el servidor.'
    }
    return `Error al consultar el resumen de órdenes (código ${err.response.status}).`
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Error desconocido al consultar el resumen de órdenes.'
}
