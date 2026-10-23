/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend en produccion/staging. Vacio = rutas relativas
   * (uso del proxy de desarrollo de Vite, ver vite.config.ts). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
