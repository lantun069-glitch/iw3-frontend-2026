import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { aceptarAlarma, obtenerAlarmas, type Alarma } from '../api/ordersApi'
import { formatearFechaAlarma, formatearNumero } from '../utils/formato'
import './AlarmasPage.css'

interface VolverState {
  volver?: string
}

/**
 * Alarmas de temperatura de una orden (TP34, F7): reutiliza
 * GET/POST .../alarmas existentes (TP28/TP29, F6), sin cambios de
 * backend ni de permisos. No depende del estado de la orden (a
 * diferencia de conciliación). "Volver a órdenes" usa el mismo
 * patrón que ConciliacionPage.
 */
export function AlarmasPage() {
  const { orderNumber: orderNumberParam } = useParams<{ orderNumber: string }>()
  const location = useLocation()
  const volverA = (location.state as VolverState | null)?.volver ?? '/ordenes'

  const orderNumber = Number(orderNumberParam)
  const numeroValido = orderNumberParam !== undefined && orderNumberParam !== '' && !Number.isNaN(orderNumber)

  const [alarmas, setAlarmas] = useState<Alarma[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  // Id de la alarma que se está aceptando ahora mismo (deshabilita
  // solo ese botón, no toda la pantalla) y texto de observación por
  // alarma pendiente - se conserva si la aceptación falla.
  const [enviando, setEnviando] = useState<number | null>(null)
  const [observaciones, setObservaciones] = useState<Record<number, string>>({})

  const abortRef = useRef<AbortController | null>(null)

  const cargar = useCallback(() => {
    // Limpia el resultado anterior antes de pedir uno nuevo: evita
    // mostrar alarmas de una orden previa (residual) mientras carga
    // o si la nueva consulta falla.
    setAlarmas([])

    if (!numeroValido) {
      setError('Número de orden inválido.')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)

    obtenerAlarmas(orderNumber, controller.signal)
      .then(setAlarmas)
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
  }, [orderNumber, numeroValido])

  useEffect(() => {
    cargar()
    return () => abortRef.current?.abort()
  }, [cargar])

  function handleAceptar(idAlarma: number) {
    setEnviando(idAlarma)
    setAviso(null)
    const observacion = observaciones[idAlarma] ?? ''

    aceptarAlarma(orderNumber, idAlarma, observacion)
      .then((actualizada) => {
        setAlarmas((prev) => prev.map((a) => (a.id === idAlarma ? actualizada : a)))
        setObservaciones((prev) => {
          const resto = { ...prev }
          delete resto[idAlarma]
          return resto
        })
      })
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          // Ya fue aceptada (ej. por otro usuario) - no hay un GET
          // individual de esta alarma: se informa y se recarga la
          // lista completa con el mismo GET de siempre.
          setAviso(`La alarma ${idAlarma} ya había sido aceptada; se actualizó la lista.`)
          cargar()
          return
        }
        // La observación escrita se conserva (no se toca el estado de
        // observaciones) para que el usuario no tenga que reescribirla.
        setAviso(mensajeDeError(err, orderNumber))
      })
      .finally(() => {
        setEnviando(null)
      })
  }

  const pendientes = alarmas.filter((a) => !a.aceptada)
  const aceptadas = alarmas.filter((a) => a.aceptada)

  return (
    <main className="alarmas-page" id="contenido">
      <div className="alarmas-header">
        <Link to={volverA} className="btn-link alarmas-volver">
          ← Volver a órdenes
        </Link>
        <h1>Alarmas — Orden {numeroValido ? orderNumber : orderNumberParam}</h1>
      </div>

      {loading && <p className="alarmas-cargando">Cargando…</p>}

      {error && (
        <p className="state-error" role="alert">
          {error}
        </p>
      )}

      {aviso && (
        <p className="state-error" role="status">
          {aviso}
        </p>
      )}

      {!loading && !error && alarmas.length === 0 && (
        <p className="state-empty">Esta orden no tiene alarmas de temperatura registradas.</p>
      )}

      {!error && alarmas.length > 0 && (
        <>
          <section className="alarmas-bloque">
            <h2>Pendientes</h2>
            {pendientes.length === 0 ? (
              <p className="alarmas-nota">Sin alarmas pendientes.</p>
            ) : (
              <ul className="alarmas-lista">
                {pendientes.map((alarma) => (
                  <li key={alarma.id} className="alarmas-item">
                    <div className="alarmas-item-datos">
                      <span className="alarmas-item-temp">{formatearNumero(alarma.temperaturaC)} °C</span>
                      <span className="alarmas-item-detalle">
                        Umbral aplicado: {formatearNumero(alarma.umbralAplicado)} °C — Disparada:{' '}
                        {formatearFechaAlarma(alarma.fechaDisparo)}
                      </span>
                    </div>
                    <div className="alarmas-item-accion">
                      <label htmlFor={`observacion-${alarma.id}`} className="alarmas-label">
                        Observación (opcional, hasta 500 caracteres)
                      </label>
                      <textarea
                        id={`observacion-${alarma.id}`}
                        maxLength={500}
                        rows={2}
                        value={observaciones[alarma.id] ?? ''}
                        disabled={enviando === alarma.id}
                        onChange={(e) =>
                          setObservaciones((prev) => ({ ...prev, [alarma.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={enviando === alarma.id}
                        onClick={() => handleAceptar(alarma.id)}
                      >
                        {enviando === alarma.id ? 'Aceptando…' : 'Aceptar'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="alarmas-bloque">
            <h2>Aceptadas</h2>
            {aceptadas.length === 0 ? (
              <p className="alarmas-nota">Sin alarmas aceptadas todavía.</p>
            ) : (
              <ul className="alarmas-lista">
                {aceptadas.map((alarma) => (
                  <li key={alarma.id} className="alarmas-item alarmas-item-aceptada">
                    <div className="alarmas-item-datos">
                      <span className="alarmas-item-temp">{formatearNumero(alarma.temperaturaC)} °C</span>
                      <span className="alarmas-item-detalle">
                        Umbral aplicado: {formatearNumero(alarma.umbralAplicado)} °C — Disparada:{' '}
                        {formatearFechaAlarma(alarma.fechaDisparo)}
                      </span>
                      <span className="alarmas-item-detalle">
                        Aceptada por {alarma.usuarioAceptacion ?? 'Sin datos'} el{' '}
                        {formatearFechaAlarma(alarma.fechaAceptacion)}
                      </span>
                      <span className="alarmas-item-detalle">Observación: {alarma.observacion ?? 'Sin observación'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function mensajeDeError(err: unknown, orderNumber: number): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 403) {
      return 'No tiene permiso para esta operación.'
    }
    if (err.response?.status === 404) {
      return `No existe una orden con número ${orderNumber}, o la alarma ya no existe.`
    }
    if (err.response?.status === 400) {
      return `Observación inválida: ${String(err.response.data && (err.response.data as { message?: string }).message)}`
    }
    if (!err.response) {
      return 'No se pudo conectar con el servidor.'
    }
    return `Error al consultar las alarmas (código ${err.response.status}).`
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Error desconocido al consultar las alarmas.'
}
