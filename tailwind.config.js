/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Animal Crossing inspired palette
        leaf: {
          50: '#f3faf0',
          100: '#e3f3da',
          200: '#c7e8b6',
          300: '#a3d68a',
          400: '#7fbf63',
          500: '#5fa844',
          600: '#488733',
          700: '#3a6a2b',
          800: '#305524',
          900: '#28461f',
        },
        sand: {
          50: '#fdf9f0',
          100: '#faf0d8',
          200: '#f4dfae',
          300: '#ecc77d',
          400: '#e3ab53',
          500: '#d78f33',
          600: '#bd6f25',
          700: '#9c5421',
          800: '#7e4420',
          900: '#67391d',
        },
        sky: {
          50: '#f0f8ff',
          100: '#e0f0ff',
          200: '#b9e0ff',
          300: '#7cc7ff',
          400: '#36abff',
          500: '#0e90f7',
          600: '#0072d4',
          700: '#005baa',
          800: '#054d8c',
          900: '#0a4174',
        },
      },
      fontFamily: {
        ac: ['"Nunito"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 14px 0 rgba(0, 0, 0, 0.08)',
        panel: '0 2px 12px 0 rgba(40, 70, 31, 0.10)',
      },
    },
  },
  plugins: [],
};
