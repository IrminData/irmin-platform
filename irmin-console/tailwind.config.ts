import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        rich_black: {
          DEFAULT: '#01161e',
          100: '#000406',
          200: '#00090c',
          300: '#010d12',
          400: '#011118',
          500: '#01161e',
          600: '#04597b',
          700: '#079cd8',
          800: '#45c6f9',
          900: '#a2e3fc',
        },
        midnight_green: {
          DEFAULT: '#124559',
          100: '#040e12',
          200: '#071c24',
          300: '#0b2935',
          400: '#0f3747',
          500: '#124559',
          600: '#20799c',
          700: '#36a9d6',
          800: '#79c5e4',
          900: '#bce2f1',
        },
        air_force_blue: {
          DEFAULT: '#598392',
          100: '#121a1d',
          200: '#24343a',
          300: '#354e57',
          400: '#476874',
          500: '#598392',
          600: '#769dab',
          700: '#99b6c0',
          800: '#bbced5',
          900: '#dde7ea',
        },
        ash_gray: {
          DEFAULT: '#aec3b0',
          100: '#1f2a20',
          200: '#3e5441',
          300: '#5e7f61',
          400: '#83a386',
          500: '#aec3b0',
          600: '#bdcebf',
          700: '#cedbcf',
          800: '#dee7df',
          900: '#eff3ef',
        },
        beige: {
          DEFAULT: '#eff6e0',
          100: '#384915',
          200: '#71912a',
          300: '#a4cc4e',
          400: '#c9e197',
          500: '#eff6e0',
          600: '#f2f8e6',
          700: '#f5f9ec',
          800: '#f8fbf2',
          900: '#fcfdf9',
        },
      },
      keyframes: {
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        slideInUp: 'slideInUp 0.2s ease-out',
        fadeIn: 'fadeIn 0.2s ease-in-out',
        slideIn: 'slideIn 0.2s ease-out forwards',
        slideOut: 'slideOut 0.2s ease-out forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
