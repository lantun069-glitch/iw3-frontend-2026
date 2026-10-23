import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Proxy de desarrollo (F7, primera unidad): evita depender del CORS
  // abierto del backend durante `npm run dev`, reenviando /api hacia el
  // backend real. VITE_API_PROXY_TARGET es opcional; sin configurar,
  // apunta al backend local tal como se lo arranca en docs/desarrollo-local.md
  // del repositorio del backend. No se usa en producción: ahi el cliente
  // llama directo a VITE_API_BASE_URL (ver src/api/httpClient.ts).
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
