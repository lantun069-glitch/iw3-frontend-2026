# iw3-frontend

Frontend del proyecto integrador de Ingeniería Web III (sistema de
órdenes de carga de gas líquido). React + TypeScript + Vite, sin
biblioteca de UI completa (CSS simple, una sola solución de estilos).

Repositorio hermano del backend (`iw3-backend`), no anidado dentro de
él. Decisiones y verificación de cada unidad en `docs/`.

## Requisitos

- **Node.js ≥20.19.0** (ver `engines` en `package.json` y `.nvmrc`).
  El mínimo real viene de dependencias transitivas de
  `typescript-eslint`/`react-router-dom`; no es un capricho del
  proyecto. Probado puntualmente con **Node 22.23.4 LTS ("Jod")**,
  instalado en `~/.local/opt/node-v22.23.4-linux-x64` (binario oficial
  de nodejs.org, verificado por checksum, sin `sudo` ni reemplazar el
  Node del sistema). Si tenés `nvm`, `nvm use` lee el `.nvmrc`
  automáticamente.
- El backend corriendo por separado (ver su propio repositorio).

## Ejecutar en desarrollo

```bash
# Si no usás nvm, antepon la ruta del Node correcto para esta sesión:
export PATH="$HOME/.local/opt/node-v22.23.4-linux-x64/bin:$PATH"

npm ci
cp .env.example .env.local   # ajustar si el backend no corre en localhost:8080
npm run dev
```

El servidor de desarrollo expone un proxy en `/api` hacia el backend
(`VITE_API_PROXY_TARGET`, default `http://localhost:8080`), para no
depender del CORS del backend durante el desarrollo (ver
`vite.config.ts`).

## Compilar

```bash
npm run build    # tsc -b && vite build
npm run lint
```

Con Node ≥20.19.0, ambos terminan sin advertencias de `engines` ni de
ESLint (verificado con Node 22.23.4: exit 0, sin salida en `lint`).

## Variables de entorno

Ver `.env.example`. Ninguna contiene secretos. `VITE_API_BASE_URL`
queda vacío por defecto (usa el proxy de desarrollo); se completa con
la URL real del backend para otros entornos (VM, configuración
pendiente — no se usa Vercel/Netlify, ver `docs/contrato-f7-login.md`).

## Build local sin el proxy de desarrollo (F8.1)

```bash
VITE_API_BASE_URL=http://localhost:8080 npm run build
npm run preview -- --port 4173 --strictPort
```

Reproducibilidad local del build junto al backend, requisitos, variables
sin secretos y una observación de CORS de un ensayo local con orígenes
distintos (pausada, no es un defecto confirmado del despliegue real -
la topología de la VM todavía debe acordarse con el usuario): ver
`docs/f8-1-reproducibilidad-local.md` en el repositorio del backend
(`iw3-backend-sanitized`).

## Estado

Primera unidad de F7 (login y sesión protegida) implementada. Ver
`docs/contrato-f7-login.md` para el detalle, las decisiones y la
evidencia de verificación.
