import { createContext } from 'react'

export interface AuthContextValue {
  isAuthenticated: boolean
  username: string | null
  roles: string[]
  loginError: string | null
  loginLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

/**
 * Definicion del contexto, separada de AuthContext.tsx (que exporta el
 * componente AuthProvider) y de useAuth.ts (que exporta el hook), para
 * que ningun archivo mezcle un export de componente con un export de
 * algo que no lo es - evita el warning de react-refresh sin
 * desactivar la regla.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
