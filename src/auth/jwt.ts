/**
 * Decodificacion de JWT SOLO para presentacion (F7, primera unidad):
 * no valida la firma ni reemplaza ninguna verificacion de seguridad,
 * que sigue siendo responsabilidad exclusiva del backend. Se usa
 * unicamente para mostrar el usuario/roles en la pantalla y para
 * detectar, del lado del cliente, un token con formato invalido o ya
 * vencido antes de intentar usarlo.
 */

export interface DecodedToken {
  sub?: string
  roles?: string[]
  email?: string
  exp?: number
  [key: string]: unknown
}

export class TokenInvalidoError extends Error {}

function base64UrlDecode(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  return atob(padded)
}

/**
 * Lanza TokenInvalidoError si el token no tiene el formato esperado
 * (3 segmentos separados por '.') o si el payload no es JSON valido.
 * No lanza por expiracion: eso se consulta aparte con estaExpirado,
 * para que el llamador decida que hacer en cada caso.
 */
export function decodeToken(token: string): DecodedToken {
  const partes = token.split('.')
  if (partes.length !== 3) {
    throw new TokenInvalidoError('El token no tiene el formato JWT esperado (header.payload.firma).')
  }
  try {
    const json = base64UrlDecode(partes[1])
    return JSON.parse(json) as DecodedToken
  } catch {
    throw new TokenInvalidoError('No se pudo decodificar el payload del token.')
  }
}

export function estaExpirado(decoded: DecodedToken, ahoraMs: number = Date.now()): boolean {
  if (typeof decoded.exp !== 'number') {
    // Sin campo exp no se puede evaluar vencimiento del lado del
    // cliente; se trata como no vencido (el backend igual lo exige y
    // lo valida en cada request protegido).
    return false
  }
  return decoded.exp * 1000 <= ahoraMs
}
