# Contexto para Claude Code

Proyecto personal de Alonso: PWA de finanzas personales. Todo el texto visible va en español (México).

- Stack: React 18 + Vite 5 + Tailwind 3 + Recharts + lucide-react. Sin router: la navegación es estado en `src/App.jsx` (lista `SECCIONES`).
- Hosting: GitHub Pages vía `.github/workflows/publicar.yml`. `vite.config.js` usa `base: './'`; mantener rutas relativas (`./icono-192.png`, `./sw.js`).
- Datos: una hoja de Google Sheets. El único backend es `apps-script/Code.gs` (pegado a mano en Apps Script). La app le hace `POST` con `Content-Type: text/plain` y cuerpo `{ clave, accion, datos }`; responde `{ ok, datos | error }`.
  - Acciones: `cargar`, `guardarMovimiento { mov, fechaOriginal }`, `borrarMovimiento { id, fecha }`, `guardarConfig { clave, filas }`.
  - Movimiento: `{ id, fecha: 'yyyy-mm-dd', tipo: 'Gasto'|'Ingreso', categoria, descripcion, monto, formaPago, notas }`.
  - Pestañas por mes con nombre `Mmm-AAAA` (Ene, Feb, ... Dic). Pestañas de configuración: Categorías, Formas de pago, Gastos fijos, Metas.
  - Si cambia la forma de los datos, hay que cambiar `Code.gs` **y** el modo de ejemplo en `src/api.js` (función `demo`), y avisar a Alonso que debe publicar una nueva versión del script.
- Nunca poner la URL del script ni la clave en el código: el repositorio es público. Se capturan en la app y viven en `localStorage`.
- Colores: variables CSS en `src/index.css` (claro y oscuro), expuestas en Tailwind como `fondo`, `panel`, `tinta`, `suave`, `linea`, `marca`, `ingreso`, `gasto`, `aviso`. Cifras con la clase `cifra`.
- Recomendaciones: reglas en `src/consejos.js`; cada una devuelve `{ nivel, titulo, texto }`.
- Probar: `npm run dev` y "Probar con datos de ejemplo". Compilar: `npm run build`.
