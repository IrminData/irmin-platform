import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'selector',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    {
      pattern: /grid-cols-./,
    },
    {
      pattern: /col-span-./,
    },
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        irmin_black: {
          DEFAULT: '#01161e',
          100: '#a2e3fc',
          200: '#45c6f9',
          300: '#079cd8',
          400: '#04597b',
          500: '#01161e',
          600: '#011118',
          700: '#010d12',
          800: '#00090c',
          900: '#000406',
        },
        irmin_blue: {
          DEFAULT: '#124559',
          100: '#bce2f1',
          200: '#79c5e4',
          300: '#36a9d6',
          400: '#20799c',
          500: '#124559',
          600: '#0f3747',
          700: '#0b2935',
          800: '#071c24',
          900: '#040e12',
        },
        irmin_teal: {
          DEFAULT: '#598392',
          100: '#dde7ea',
          200: '#bbced5',
          300: '#99b6c0',
          400: '#769dab',
          500: '#598392',
          600: '#476874',
          700: '#354e57',
          800: '#24343a',
          900: '#121a1d',
        },
        irmin_green: {
          DEFAULT: '#aec3b0',
          100: '#eff3ef',
          200: '#dee7df',
          300: '#cedbcf',
          400: '#bdcebf',
          500: '#aec3b0',
          600: '#83a386',
          700: '#5e7f61',
          800: '#3e5441',
          900: '#1f2a20',
        },
        irmin_light_green: {
          DEFAULT: '#eff6e0',
          100: '#fcfdf9',
          200: '#f8fbf2',
          300: '#f5f9ec',
          400: '#f2f8e6',
          500: '#eff6e0',
          600: '#c9e197',
          700: '#a4cc4e',
          800: '#71912a',
          900: '#384915',
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
