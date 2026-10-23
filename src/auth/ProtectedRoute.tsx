import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { useAuth } from './useAuth'

/**
 * Ruta protegida (F7): sin sesion activa, redirige a /login.
 * isAuthenticated depende de que exista un token ya decodificado y no
 * vencido al momento de iniciar sesion (ver AuthContext); una
 * expiracion DURANTE la sesion se detecta recien en la siguiente
 * llamada a la API que reciba 401 (ver httpClient), no con un timer
 * propio - decision del equipo, para no anticipar infraestructura no
 * pedida.
 *
 * Tambien renderiza el encabezado comun (nav/usuario/logout) para no
 * repetirlo en cada pantalla protegida - es presentacion, no agrega
 * ninguna decision de permisos o sesion nueva.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <AppHeader />
      {children}
    </>
  )
}
