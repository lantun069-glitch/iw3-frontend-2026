import axios, { type AxiosError } from 'axios'

/**
 * Instancia dedicada EXCLUSIVAMENTE a nuestra API (F7, primera
 * unidad): nunca se usa axios global, asi que el header Authorization
 * de abajo solo se agrega a solicitudes de nuestro backend, nunca a
 * otras llamadas que pudiera hacer la aplicacion mas adelante.
 *
 * VITE_API_BASE_URL vacio (default) deja las rutas relativas
 * ("/api/v1/..."), que en desarrollo resuelve el proxy de Vite (ver
 * vite.config.ts) sin depender del CORS del backend. Para apuntar a
 * un backend real (VM, configuracion pendiente) se fija esa variable
 * con la URL completa.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL ?? ''

export const httpClient = axios.create({ baseURL })

const LOGIN_PATH = '/api/v1/login'

let currentToken: string | null = null
let onSessionExpired: (() => void) | null = null

export function setAuthToken(token: string | null): void {
  currentToken = token
}

/**
 * Registrado por AuthProvider: se invoca cuando un 401 llega en una
 * solicitud que NO es el login (es decir, la sesion que creiamos
 * valida ya no lo es). Un 401 del propio intento de login no pasa por
 * aqui - ver el interceptor de respuesta.
 */
export function setOnSessionExpired(callback: (() => void) | null): void {
  onSessionExpired = callback
}

httpClient.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.set('Authorization', `Bearer ${currentToken}`)
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const esLogin = error.config?.url === LOGIN_PATH
    if (error.response?.status === 401 && !esLogin) {
      // Sesion invalida/vencida en un recurso protegido: terminar la
      // sesion. Un 403 NO entra aqui a proposito: el usuario esta
      // autenticado, solo le falta el permiso para esa operacion
      // puntual - no corresponde cerrarle la sesion por eso.
      onSessionExpired?.()
    }
    return Promise.reject(error)
  },
)
