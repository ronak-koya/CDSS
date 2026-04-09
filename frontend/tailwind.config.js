/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          200: 'rgb(var(--primary-200) / <alpha-value>)',
          300: 'rgb(var(--primary-300) / <alpha-value>)',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
          800: 'rgb(var(--primary-800) / <alpha-value>)',
          900: 'rgb(var(--primary-900) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'pulse-ring': {
          '0%':   { transform: 'scale(0.8)', opacity: '0.6' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'pulse-ring-slow': {
          '0%':   { transform: 'scale(0.6)', opacity: '0.4' },
          '100%': { transform: 'scale(2.8)', opacity: '0' },
        },
        'waveform': {
          '0%, 100%': { scaleY: '0.4' },
          '50%':       { scaleY: '1' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'pulse-ring':      'pulse-ring 2.8s cubic-bezier(0.4,0,0.6,1) infinite',
        'pulse-ring-slow': 'pulse-ring-slow 3.6s cubic-bezier(0.4,0,0.6,1) infinite 0.8s',
        'waveform':        'waveform 1s ease-in-out infinite',
        'fade-up':         'fade-up 0.5s ease-out both',
        'float':           'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
