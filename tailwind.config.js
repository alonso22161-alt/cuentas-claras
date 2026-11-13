/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        fondo: 'var(--fondo)',
        panel: 'var(--panel)',
        hundido: 'var(--hundido)',
        tinta: 'var(--tinta)',
        suave: 'var(--suave)',
        linea: 'var(--linea)',
        marca: 'var(--marca)',
        'marca-fuerte': 'var(--marca-fuerte)',
        'marca-suave': 'var(--marca-suave)',
        sobremarca: 'var(--sobremarca)',
        ingreso: 'var(--ingreso)',
        'ingreso-suave': 'var(--ingreso-suave)',
        gasto: 'var(--gasto)',
        aviso: 'var(--aviso)',
        'aviso-suave': 'var(--aviso-suave)',
        nav: 'var(--nav)',
        'nav-activo': 'var(--nav-activo)',
        'nav-tinta': 'var(--nav-tinta)',
      },
      boxShadow: { tarjeta: 'var(--sombra)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'] },
    },
  },
  plugins: [],
};
