# Cuentas Claras

App web de finanzas personales. Se publica gratis en GitHub Pages, se instala en el celular como acceso directo (PWA) y guarda todo en una hoja de cálculo de tu Google Drive, con una pestaña por mes (`Nov-2026`, `Dic-2026`, ...).

```
Celular / navegador  ──►  GitHub Pages (la app, sin datos)
        │
        └── cada movimiento ──►  Apps Script (tu cuenta)  ──►  Hoja de cálculo en tu Drive
```

## Parte 1. Crear la hoja y el script (10 min, una sola vez)

1. En Google Drive crea una hoja de cálculo nueva. Ponle nombre, por ejemplo **Mis finanzas**.
2. En la hoja: **Extensiones > Apps Script**.
3. Borra lo que aparezca y pega todo el contenido de `apps-script/Code.gs`.
4. En la línea `const CLAVE = 'CAMBIA-ESTA-CLAVE';` escribe una frase larga que solo tú conozcas (mínimo 12 caracteres). Guarda.
5. Arriba elige la función **instalar** y presiona **Ejecutar**. Google pedirá permiso para que el script edite tu hoja: acéptalo. Se crean las pestañas `Categorías`, `Formas de pago`, `Gastos fijos`, `Metas` y la del mes actual.
6. **Implementar > Nueva implementación > Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   - Implementar y copia la **URL de la aplicación web** (termina en `/exec`).

"Cualquier usuario" es necesario para que la app pueda llamar al script; lo que protege tus datos es la clave del paso 4. Sin ella el script rechaza todo.

> Si después cambias `Code.gs`: **Implementar > Administrar implementaciones > lápiz > Versión: Nueva versión > Implementar**. Así la URL no cambia.

## Parte 2. Publicar la app gratis en GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `cuentas-claras`). En el plan gratuito debe ser **público**; no hay problema porque el código no contiene tu URL, tu clave ni tus datos.
2. Sube este proyecto:
   ```bash
   git init
   git add .
   git commit -m "Cuentas Claras"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/cuentas-claras.git
   git push -u origin main
   ```
3. En GitHub: **Settings > Pages > Source: GitHub Actions**.
4. Espera a que termine la acción "Publicar en GitHub Pages" (pestaña Actions). Tu app queda en `https://TU_USUARIO.github.io/cuentas-claras/`.

Cada `git push` a `main` vuelve a publicar solo.

## Parte 3. Conectar e instalar en el celular

1. Abre la dirección de tu app en el celular.
2. Pega la URL del paso 6 y tu clave. Presiona **Conectar**.
3. Crea el acceso directo:
   - **Android (Chrome):** menú ⋮ > **Agregar a pantalla principal** (o **Instalar app**).
   - **iPhone (Safari):** botón Compartir > **Agregar a inicio**.

Abre a pantalla completa, con ícono propio. Si capturas un gasto sin internet, se guarda en el teléfono y se envía a tu hoja al volver la conexión.

## Trabajar en tu computadora

```bash
npm install
npm run dev
```

En la pantalla de inicio puedes usar **Probar con datos de ejemplo** para ver todo funcionando sin conectar Google.

## Qué hay en cada archivo

| Archivo | Para qué |
|---|---|
| `apps-script/Code.gs` | Lo único que escribe en tu hoja. Va pegado en Apps Script, no se publica con la app. |
| `src/App.jsx` | Menú y lista de secciones. |
| `src/paginas/` | Una pantalla por archivo: Capturar, Movimientos, Resumen, Consejos, Presupuestos, Fijos, Metas, Ajustes. |
| `src/FormularioMov.jsx` | Formulario para capturar y editar movimientos. |
| `src/consejos.js` | Reglas de las recomendaciones. Aquí agregas o ajustas avisos. |
| `src/utils.js` | Cálculos (totales por mes, promedios) y sugerencia de categoría por palabras. |
| `src/api.js` / `src/store.jsx` | Comunicación con Apps Script, cola sin conexión y estado global. |
| `src/index.css` | Colores (claro y oscuro) como variables. |
| `public/` | Ícono, manifiesto y service worker de la PWA. |

## Bueno saber

- **Gastos fijos:** se registran solos el día indicado, la primera vez que abres la app ese día o después. Si borras uno ya registrado, vuelve a aparecer ese mes; para evitarlo, pausa el gasto fijo.
- **Editar en la hoja:** puedes corregir montos o categorías directo en Google Sheets. No cambies la columna A (ID, está oculta) ni los nombres de las pestañas.
- **Categorías:** si quitas una categoría, los movimientos viejos conservan su nombre.
- **Clave:** se guarda solo en el dispositivo donde la escribes. Para cambiarla, edítala en `Code.gs`, publica una nueva versión y vuelve a conectar en Ajustes.
