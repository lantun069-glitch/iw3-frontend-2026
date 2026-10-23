import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import './AppHeader.css'

/**
 * Encabezado de las pantallas protegidas (navegacion, usuario,
 * logout). Vive en ProtectedRoute para no duplicarlo en cada pagina;
 * no decide permisos ni sesion, solo lee lo que ya expone useAuth.
 */
export function AppHeader() {
  const { username, logout } = useAuth()

  return (
    <header className="app-header">
      <span className="app-header-brand">IW3 · Órdenes</span>

      <nav className="app-header-nav" aria-label="Principal">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'app-header-link is-active' : 'app-header-link')}>
          Inicio
        </NavLink>
        <NavLink
          to="/ordenes"
          className={({ isActive }) => (isActive ? 'app-header-link is-active' : 'app-header-link')}
        >
          Órdenes
        </NavLink>
      </nav>

      <div className="app-header-user">
        <span className="app-header-username">{username}</span>
        <button type="button" className="btn btn-secondary app-header-logout" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
