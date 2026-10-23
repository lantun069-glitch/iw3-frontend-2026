import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { obtenerConciliacion, type ConciliacionOrden } from '../api/ordersApi'
import { EstadoBadge } from '../components/EstadoBadge'
import {
  formatearCaudalKgH,
  formatearDensidad,
  formatearDiferenciaKg,
  formatearPesoKg,
  formatearTemperaturaC,
} from '../utils/formato'
import './ConciliacionPage.css'

interface VolverState {
  volver?: string
}

/**
 * Conciliación de una orden finalizada (TP35, F7): solo disponible en
 * estado 4, el backend ya lo valida de forma independiente de esta
 * pantalla (404/409, sin cambios de permisos ni de contrato). "Volver
 * a órdenes" usa el estado de navegación que dejó OrdersListPage para
 * no perder el filtro/página/orden con los que se llegó acá; sin ese
 * estado (ej. URL directa), cae a /ordenes sin filtro.
 */
export function ConciliacionPage() {
  const { orderNumber: orderNumberParam } = useParams<{ orderNumber: string }>()
  const location = useLocation()
  const volverA = (location.state as VolverState | null)?.volver ?? '/ordenes'

  const orderNumber = Number(orderNumberParam)
  const numeroValido = orderNumberParam !== undefined && orderNumberParam !== '' && !Number.isNaN(orderNumber)

  const [conciliacion, setConciliacion] = useState<ConciliacionOrden | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Limpia el resultado anterior antes de pedir uno nuevo: evita
    // mostrar la conciliacion de la orden previa (residual) mientras
    // carga o si la nueva consulta termina en error.
    setConciliacion(null)

    if (!numeroValido) {
      setError('Número de orden inválido.')
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)

    obtenerConciliacion(orderNumber, controller.signal)
      .then(setConciliacion)
      .catch((err) => {
        if (axios.isCancel(err)) {
          return
        }
        setError(mensajeDeError(err, orderNumber))
      })
      .finally(() => {
        if (abortRef.current === controller) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [orderNumber, numeroValido])

  return (
    <main className="conciliacion-page" id="contenido">
      <div className="conciliacion-header">
        <Link to={volverA} className="btn-link conciliacion-volver">
          ← Volver a órdenes
        </Link>
        <div className="conciliacion-titulo">
          <h1>Conciliación — Orden {numeroValido ? orderNumber : orderNumberParam}</h1>
          {/* Solo se muestra "Finalizada" cuando la consulta realmente
              trajo la conciliacion - nunca durante la carga ni si el
              backend la rechazo (404/409 u otro error). */}
          {conciliacion && !error && <EstadoBadge estado={4} />}
        </div>
      </div>

      {loading && <p className="conciliacion-cargando">Cargando…</p>}

      {error && (
        <p className="state-error" role="alert">
          {error}
        </p>
      )}

      {conciliacion && !error && (
        <>
          <div className="conciliacion-resumen">
            <div className="conciliacion-resumen-item">
              <span className="conciliacion-resumen-valor">{formatearPesoKg(conciliacion.netoKg)}</span>
              <span className="conciliacion-resumen-etiqueta">Neto por balanza</span>
            </div>
            <div className="conciliacion-resumen-item">
              <span className="conciliacion-resumen-valor">{formatearPesoKg(conciliacion.productoCargadoKg)}</span>
              <span className="conciliacion-resumen-etiqueta">Producto cargado</span>
            </div>
            <div className="conciliacion-resumen-item">
              <span className="conciliacion-resumen-valor">{formatearDiferenciaKg(conciliacion.diferenciaKg)}</span>
              <span className="conciliacion-resumen-etiqueta">Diferencia (neto − producto cargado)</span>
            </div>
          </div>

          <section className="conciliacion-bloque">
            <h2>Peso bruto − Tara = Neto</h2>
            <p className="conciliacion-desglose">
              <span>{formatearPesoKg(conciliacion.pesoBrutoKg)}</span>
              <span className="conciliacion-operador">−</span>
              <span>{formatearPesoKg(conciliacion.taraKg)}</span>
              <span className="conciliacion-operador">=</span>
              <span className="conciliacion-desglose-resultado">{formatearPesoKg(conciliacion.netoKg)}</span>
            </p>
          </section>

          <section className="conciliacion-bloque">
            <h2>Telemetría</h2>
            <p className="conciliacion-nota">Promedio sobre las muestras almacenadas de esta orden, no sobre todas las lecturas recibidas.</p>
            <div className="conciliacion-tabla-wrap">
              <table className="conciliacion-comparativa">
                <caption className="visually-hidden">Última lectura comparada con el promedio del histórico almacenado</caption>
                <thead>
                  <tr>
                    <th scope="col">Variable</th>
                    <th scope="col">Última lectura</th>
                    <th scope="col">Promedio del histórico</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Temperatura</th>
                    <td className="num">{formatearTemperaturaC(conciliacion.ultimaTemperaturaC)}</td>
                    <td className="num">{formatearTemperaturaC(conciliacion.promedioTemperaturaC)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Densidad</th>
                    <td className="num">{formatearDensidad(conciliacion.ultimaDensidad)}</td>
                    <td className="num">{formatearDensidad(conciliacion.promedioDensidad)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Caudal</th>
                    <td className="num">{formatearCaudalKgH(conciliacion.ultimoCaudalKgH)}</td>
                    <td className="num">{formatearCaudalKgH(conciliacion.promedioCaudalKgH)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function mensajeDeError(err: unknown, orderNumber: number): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 404) {
      return `No existe una orden con número ${orderNumber}.`
    }
    if (err.response?.status === 409) {
      return `La orden ${orderNumber} no está finalizada; la conciliación solo está disponible para órdenes en estado 4.`
    }
    if (!err.response) {
      return 'No se pudo conectar con el servidor.'
    }
    return `Error al consultar la conciliación (código ${err.response.status}).`
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Error desconocido al consultar la conciliación.'
}
