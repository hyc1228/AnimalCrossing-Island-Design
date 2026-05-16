/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "leaf" repurposed as the warm Nook brown palette (used everywhere as text/border/bg)
        // so the entire app gets the AC "warm cream + brown text" feel automatically.
        leaf: {
          50: '#fdfbf3',
          100: '#f8f4e5',
          200: '#ede2c5',
          300: '#d9c69d',
          400: '#c4b89e', // border-color-light
          500: '#a89878', // border-color-hover
          600: '#8a7b66', // text muted
          700: '#725d42', // body text
          800: '#794f27', // main heading text
          900: '#5f3d1d',
        },
        // AC primary mint accent
        mint: {
          50: '#e6f9f6',
          100: '#c1f0ea',
          200: '#9be8de',
          300: '#65d9cc',
          400: '#3dd4c6', // hover
          500: '#19c8b9', // primary
          600: '#11a89b', // active
          700: '#0f8a7f',
        },
        // Cream / page backgrounds
        cream: {
          50: '#fdfdf6',
          100: '#faf6e8', // close to input bg rgb(247,243,223)
          200: '#f5efd8',
          300: '#f0e8d8',
        },
        // Warm sand for prices / total bells highlight
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
        // Yellow focus highlight (AC game uses yellow not blue!)
        sun: {
          400: '#ffd633',
          500: '#ffcc00', // focus
          600: '#e0b800', // dark
        },
        // 3D shadow tones
        shadow: {
          btn: '#bdaea0',
          input: '#d4c9b4',
          switchOn: '#5a9e1e',
        },
        // Sky for the canvas water hint (kept for compatibility)
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
        ac: [
          'Nunito',
          '"Zen Maru Gothic"',
          '"Noto Sans SC"',
          '"M PLUS Rounded 1c"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
      boxShadow: {
        // soft warm shadows (cards, panels)
        soft: '0 3px 10px 0 rgba(61, 52, 40, 0.10)',
        panel: '0 4px 14px 0 rgba(61, 52, 40, 0.10)',
        card: '0 4px 10px rgba(107, 92, 67, 0.42)',
        // 3D game-button bottom-only shadows
        btn: '0 5px 0 0 #bdaea0',
        btnHover: '0 6px 0 0 #bdaea0',
        btnActive: '0 1px 0 0 #bdaea0',
        btnMint: '0 5px 0 0 #11a89b',
        btnMintHover: '0 6px 0 0 #11a89b',
        btnSun: '0 5px 0 0 #e0b800',
        input3d: '0 3px 0 0 #d4c9b4',
        inputFocus: '0 3px 0 0 #e0b800, 0 0 0 3px rgba(255, 204, 0, 0.18)',
      },
      keyframes: {
        zoomIn: {
          '0%': { opacity: 0, transform: 'scale(0.92)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        leafWiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-10deg)' },
          '75%': { transform: 'rotate(10deg)' },
        },
        blink: {
          '50%': { opacity: 0 },
        },
      },
      animation: {
        zoomIn: 'zoomIn 0.3s ease',
        fadeUp: 'fadeUp 0.5s ease-out',
        leafWiggle: 'leafWiggle 2s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
};
