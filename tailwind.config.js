/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16324F',      // azul tinta profundo - texto e cabeceiras
        brand: '#007bc4',    // azul corporativo CMUS - acentos e links
        paper: '#F6F1E7',    // papel cru - fondo principal
        paperdark: '#EDE5D3',// papel en sombra - fondo secundario
        brass: '#C89B3C',    // latón - selos, destacados
        route: '#3E7C59',    // verde ruta - liñas de traxecto
        coral: '#E1572C',    // marcador - pins do mapa, alertas suaves
        charcoal: '#2B2926', // case-negro - texto principal
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        stamp: '0 2px 0 rgba(43,41,38,0.06), 0 8px 20px -8px rgba(22,50,79,0.25)',
      },
    },
  },
  plugins: [],
}
