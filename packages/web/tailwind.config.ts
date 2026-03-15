import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Override stone to go darker
        stone: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
          950: '#0C0A09',
        },
        gold: {
          DEFAULT: '#CA8A04',
          50: '#FEF9EC',
          100: '#FEF0C7',
          200: '#FCD34D',
          300: '#FBBF24',
          400: '#F59E0B',
          500: '#CA8A04',
          600: '#B45309',
          700: '#92400E',
          800: '#78350F',
          900: '#451A03',
        },
        cosmic: {
          bg: '#0C0A09',
          surface: '#1C1917',
          elevated: '#292524',
          border: '#44403C',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(202, 138, 4, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(202, 138, 4, 0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderColor: {
        DEFAULT: '#44403C',
      },
    },
  },
  plugins: [],
};

export default config;
