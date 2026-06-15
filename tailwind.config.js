/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      colors: {
        // Mars 個人品牌色系：溫暖深色 + 沙色 + 火星橘 + 霓虹綠（科技遊牧）
        ink: {
          950: '#0d0a09',
          900: '#161210',
          800: '#1f1a17',
          700: '#2a2320',
          600: '#3a322d',
        },
        sand: {
          50: '#faf6ef',
          100: '#f1e9d8',
          200: '#e3d4b3',
          300: '#cdb585',
          400: '#b89763',
          500: '#a07a48',
        },
        mars: {
          400: '#e07a55',
          500: '#d65a36',
          600: '#b8431f',
        },
        neon: {
          400: '#7af0a8',
          500: '#3edc82',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Noto Serif TC"', 'Georgia', 'serif'],
        sans: ['Inter', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
