/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f4f7f7',
          100: '#e9efef',
          200: '#d3dfdf',
          300: '#b3c6c7',
          400: '#7f999c',
          500: '#5a7478',
          600: '#3f565a',
          700: '#243438',
          800: '#131d20',
          900: '#0b1214',
          950: '#060a0b',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
