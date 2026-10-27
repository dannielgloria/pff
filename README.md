# PFF · Finanzas familiares

Frontend de una aplicación familiar privada, construido con React, TypeScript y Vite. La información se consulta sólo después de iniciar sesión contra la API privada.

Este repositorio público contiene exclusivamente el frontend y su workflow. El backend, los scripts SQL, las pruebas financieras y las configuraciones privadas se mantienen fuera de GitHub y se despliegan en Hostinger. No hay datos financieros de ejemplo presentados como reales.

## Desarrollo

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
```

## GitHub Pages

En Settings → Pages, elegir GitHub Actions. El workflow usa `/pff/` como ruta base y HashRouter para las páginas internas. La URL esperada es https://dannielgloria.github.io/pff/.

La variable pública del repositorio `VITE_API_URL` debe contener la raíz HTTPS de la API, sin barra final. No es una credencial. Mientras no esté definida, la pantalla de acceso informa que la API está pendiente y no permite iniciar sesión. Nunca configurar credenciales MySQL como variables VITE_* ni subir archivos .env.

La API usa sesiones HttpOnly y CSRF. En algunos navegadores las cookies entre github.io y el hosting pueden estar bloqueadas: la instalación privada incluye una alternativa bajo el mismo origen del hosting.
