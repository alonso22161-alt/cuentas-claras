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
        sobremarca: 'var(--sobremarca)',
        ingreso: 'var(--ingreso)',
        gasto: 'var(--gasto)',
        aviso: 'var(--aviso)',
      },
      fontFamily: {
        cifra: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        texto: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
