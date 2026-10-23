import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import './LoginPage.css'

interface LocationState {
  from?: { pathname: string }
}

export function LoginPage() {
  const { login, loginLoading, loginError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [camposInvalidos, setCamposInvalidos] = useState<{ username?: string; password?: string }>({})

  function validar(): boolean {
    const errores: { username?: string; password?: string } = {}
    if (!username.trim()) {
      errores.username = 'Ingrese el usuario.'
    }
    if (!password) {
      errores.password = 'Ingrese la contraseña.'
    }
    setCamposInvalidos(errores)
    return Object.keys(errores).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validar()) {
      return
    }
    try {
      await login(username, password)
      const destino = (location.state as LocationState | null)?.from?.pathname ?? '/'
      navigate(destino, { replace: true })
    } catch {
      // loginError ya queda seteado en el contexto; nada mas que hacer
      // aca (no repetir el mensaje ni navegar).
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <span className="login-brand">IW3 · Órdenes</span>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h1>Iniciar sesión</h1>

          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loginLoading}
            aria-invalid={Boolean(camposInvalidos.username)}
          />
          {camposInvalidos.username && <p className="campo-error">{camposInvalidos.username}</p>}

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loginLoading}
            aria-invalid={Boolean(camposInvalidos.password)}
          />
          {camposInvalidos.password && <p className="campo-error">{camposInvalidos.password}</p>}

          {loginError && (
            <p className="login-error" role="alert">
              {loginError}
            </p>
          )}

          <button type="submit" className="btn btn-primary login-submit" disabled={loginLoading}>
            {loginLoading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}
