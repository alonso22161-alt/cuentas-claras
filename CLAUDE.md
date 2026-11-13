# Contexto para Claude Code

Proyecto personal de Alonso: **MiControl**, PWA de finanzas personales (antes "Cuentas Claras"). Todo el texto visible va en español (México).

- Stack: React 18 + Vite 5 + Tailwind 3 + Recharts + lucide-react. Sin router: la navegación es estado en `src/App.jsx` (lista `SECCIONES`, agrupada como en el menú lateral; `mes: true` muestra el selector de mes y la página recibe `mes`).
- Hosting: GitHub Pages vía `.github/workflows/publicar.yml`. `vite.config.js` usa `base: './'`; mantener rutas relativas (`./icono-192.png`, `./sw.js`). Si cambian archivos de la PWA, sube la versión de `CACHE` en `public/sw.js`.
- Datos: una hoja de Google Sheets. El único backend es `apps-script/Code.gs` (pegado a mano en Apps Script). La app le hace `POST` con `Content-Type: text/plain` y cuerpo `{ clave, accion, datos }`; responde `{ ok, datos | error }`.
  - Acciones: `cargar` (devuelve todas las pestañas de `CONFIG`, `movimientos`, `urlHoja`, `version`), `guardarMovimiento { mov, fechaOriginal }`, `guardarMovimientos { movs }`, `borrarMovimiento { id, fecha }`, `guardarConfig { clave, filas }`.
  - Movimiento: `{ id, fecha: 'yyyy-mm-dd', tipo: 'Gasto'|'Ingreso'|'Transferencia', categoria, subcategoria, descripcion, monto, formaPago, notas }`. Las transferencias no son ingreso ni gasto.
  - Pestañas por mes `Mmm-AAAA`. Configuración: Categorías, Formas de pago, Gastos fijos, Metas, Tarjetas, Compras a meses (`mesesTarjeta`), Deudas, Patrimonio, Historial patrimonio, Preferencias.
  - `VERSION` en Code.gs y `VERSION_SCRIPT` en `src/api.js` deben coincidir; si el script es más viejo, la app avisa y bloquea las claves según `VERSION_CLAVE` (versión mínima por pestaña).
  - Si cambia la forma de los datos: cambiar `Code.gs`, `normalizar()` y el modo de ejemplo en `src/api.js` (`demo`, `sembrar`, `sembrarV2`), y avisar a Alonso que debe pegar el script, volver a poner su clave y publicar una nueva versión.
- Movimientos vinculados (`src/finanzas.js`): el ID indica a qué pertenecen. `FIJO-<id>-<aaaa-mm>[-n]` gasto/ingreso fijo (mismo cálculo de fechas en `ocurrencias()` y `diasFijo_()`), `TJ-<id>-…` pago de tarjeta (Transferencia), `DE-<id>-…` abono a deuda, `ME-<id>-…` aportación a meta. Saldos de tarjetas y deudas = saldo registrado en `fechaSaldo` ± movimientos desde esa fecha; `ajustarSaldo()` calcula el saldo base cuando el usuario escribe el saldo real. Compras a meses: `estadoPlan()` avanza un pago por cada fecha límite de la tarjeta desde `fechaRegistro`; el pago del mes de la tarjeta (`pagoMes`) es el saldo menos lo que aún no vence.
- Nunca poner la URL del script ni la clave en el código, y nunca subir `apps-script/*.txt` (está en `.gitignore`): el repositorio es público. Se capturan en la app y viven en `localStorage` (`cc_conexion`).
- Colores: variables CSS en `src/index.css` (claro, oscuro y `data-tema`), expuestas en Tailwind (`fondo`, `panel`, `hundido`, `tinta`, `suave`, `linea`, `marca`, `ingreso`, `gasto`, `aviso`, `nav`…). Componentes base en `src/ui.jsx` (`Panel`, `Indicador`, `Boton`, `Hoja`, tablas).
- Recomendaciones: reglas en `src/consejos.js`; cada una devuelve `{ nivel, titulo, texto }`.
- Exportar: `src/excel.js` genera .xlsx sin dependencias.
- Probar: `npm run dev` y "Probar con datos de ejemplo". Compilar: `npm run build`.
