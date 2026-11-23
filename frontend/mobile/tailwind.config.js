/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Mesma paleta de constants/colors.ts e das telas atuais
      colors: {
        primary: '#8628FF',
        'primary-dark': '#7B2BEF',
        ink: '#3D2683',
        accent: '#FF5757',
        lilac: '#C9B8F0',
        'violet-muted': '#9B8AC4',
      },
    },
  },
  plugins: [],
};