import { httpClient } from './httpClient'

/**
 * POST /api/v1/login (backend, ya existente): recibe username/password
 * como parametros de formulario (no JSON) y devuelve el JWT como
 * texto plano en el cuerpo de la respuesta - no un JSON con un campo
 * "token". Por eso se pide responseType 'text' explicitamente, para
 * no depender de que axios adivine el formato.
 */
export async function login(username: string, password: string): Promise<string> {
  const body = new URLSearchParams()
  body.set('username', username)
  body.set('password', password)

  const response = await httpClient.post<string>('/api/v1/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'text',
  })
  return response.data
}
