/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: '#1C1A17',
        prj: { DEFAULT: '#1E4D8C', light: '#C8DAFA', lighter: '#EEF4FC' },
        pgm: { DEFAULT: '#1D7A5F', light: '#B8E8D0', lighter: '#E4F5EC' },
        amber: { DEFAULT: '#FAEEDA', text: '#D4860A' },
        danger: { DEFAULT: '#C8472B', light: '#FCEBEB' },
        gate: '#633806',
        eu: '#6B2D8C',
        grey: { DEFAULT: '#5F5E5A', light: '#F5F3EE' },
      },
    },
  },
  plugins: [],
};
