import { useAuth } from '../auth/useAuth'
import './WelcomePage.css'

/**
 * Pantalla minima de bienvenida (F7, primera unidad): solo confirma
 * que la sesion esta activa. Sin datos ficticios ni un dashboard
 * simulado - eso es contenido de unidades posteriores, con datos
 * reales del backend.
 */
export function WelcomePage() {
  const { username, roles, logout } = useAuth()

  return (
    <main className="welcome-page">
      <h1>Sesión iniciada</h1>
      <p>
        Usuario: <strong>{username}</strong>
      </p>
      <p>
        Roles (solo para mostrar; la autorización real la aplica el backend en cada
        operación):{' '}
        <strong>{roles.length > 0 ? roles.join(', ') : 'sin roles asignados'}</strong>
      </p>
      <button onClick={logout}>Cerrar sesión</button>
    </main>
  )
}
