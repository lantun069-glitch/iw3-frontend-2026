import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

/**
 * Ruta protegida (F7, primera unidad): sin sesion activa, redirige a
 * /login. isAuthenticated depende de que exista un token ya decodificado
 * y no vencido al momento de iniciar sesion (ver AuthContext); una
 * expiracion DURANTE la sesion se detecta recien en la siguiente
 * llamada a la API que reciba 401 (ver httpClient), no con un timer
 * propio - decision del equipo, para no anticipar infraestructura no
 * pedida en esta unidad.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}
