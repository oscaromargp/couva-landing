/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta PardeSantos — costa / arena / mar profundo
        ink:    '#0B1F2A', // azul petróleo profundo (fondo oscuro)
        deep:   '#0F2E3D',
        sea:    '#14708A', // turquesa costa
        aqua:   '#2AA5B8',
        sand:   '#E9DFCE', // arena
        cream:  '#F7F3EC',
        gold:   '#C9A24B', // acento premium / CTA
        golddk: '#A9853A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      maxWidth: { content: '1200px' },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(11,31,42,0.25)',
        gold: '0 8px 30px -8px rgba(201,162,75,0.45)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { 'fade-up': 'fade-up 0.7s ease-out both' },
    },
  },
  plugins: [],
};
