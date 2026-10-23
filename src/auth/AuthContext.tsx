import axios from 'axios'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { login as loginRequest } from '../api/authApi'
import { setAuthToken, setOnSessionExpired } from '../api/httpClient'
import { AuthContext, type AuthContextValue } from './context'
import { decodeToken, estaExpirado, TokenInvalidoError, type DecodedToken } from './jwt'

/**
 * Token en memoria unicamente (F7, primera unidad, decision del
 * equipo): recargar la pagina cierra la sesion. No se usa
 * localStorage/sessionStorage para el token. No se guarda ninguna
 * contrasena en ningun momento, ni siquiera en memoria mas alla del
 * tiempo del propio submit.
 *
 * Este archivo exporta UNICAMENTE el componente AuthProvider (el
 * contexto vive en ./context, el hook useAuth en ./useAuth) para que
 * Fast Refresh pueda tratarlo como un modulo de componentes puro.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [decoded, setDecoded] = useState<DecodedToken | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const logout = useCallback(() => {
    setAuthToken(null)
    setDecoded(null)
  }, [])

  useEffect(() => {
    setOnSessionExpired(logout)
    return () => setOnSessionExpired(null)
  }, [logout])

  const login = useCallback(async (username: string, password: string) => {
    setLoginLoading(true)
    setLoginError(null)
    try {
      const token = await loginRequest(username, password)

      let nuevoDecoded: DecodedToken
      try {
        nuevoDecoded = decodeToken(token)
      } catch (e) {
        if (e instanceof TokenInvalidoError) {
          throw new Error('El servidor devolvió un token con formato inválido.')
        }
        throw e
      }
      if (estaExpirado(nuevoDecoded)) {
        throw new Error('El token recibido ya está vencido.')
      }

      setAuthToken(token)
      setDecoded(nuevoDecoded)
    } catch (err) {
      setAuthToken(null)
      setDecoded(null)
      setLoginError(mensajeDeError(err))
      throw err
    } finally {
      setLoginLoading(false)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: decoded !== null,
      username: decoded?.sub ?? null,
      roles: decoded?.roles ?? [],
      loginError,
      loginLoading,
      login,
      logout,
    }),
    [decoded, loginError, loginLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function mensajeDeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 401) {
      return 'Usuario o contraseña incorrectos.'
    }
    if (err.response?.status === 403) {
      return 'No tiene permiso para iniciar sesión.'
    }
    if (!err.response) {
      return 'No se pudo conectar con el servidor.'
    }
    return `Error al iniciar sesión (código ${err.response.status}).`
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Error desconocido al iniciar sesión.'
}
