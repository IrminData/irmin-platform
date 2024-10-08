import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
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
      fontFamily: {
        body: ['var(--font-inter)'],
        display: ['var(--font-big-shoulders-display)'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        irmin_black: {
          '100': 'hsla(var(--irmin-black-100) / <alpha-value>)',
          '200': 'hsla(var(--irmin-black-200) / <alpha-value>)',
          '300': 'hsla(var(--irmin-black-300) / <alpha-value>)',
          '400': 'hsla(var(--irmin-black-400) / <alpha-value>)',
          '500': 'hsla(var(--irmin-black-500) / <alpha-value>)',
          '600': 'hsla(var(--irmin-black-600) / <alpha-value>)',
          '700': 'hsla(var(--irmin-black-700) / <alpha-value>)',
          '800': 'hsla(var(--irmin-black-800) / <alpha-value>)',
          '900': 'hsla(var(--irmin-black-900) / <alpha-value>)',
          DEFAULT: 'hsla(var(--irmin-black-500) / <alpha-value>)',
        },
        irmin_blue: {
          '100': 'hsla(var(--irmin-blue-100) / <alpha-value>)',
          '200': 'hsla(var(--irmin-blue-200) / <alpha-value>)',
          '300': 'hsla(var(--irmin-blue-300) / <alpha-value>)',
          '400': 'hsla(var(--irmin-blue-400) / <alpha-value>)',
          '500': 'hsla(var(--irmin-blue-500) / <alpha-value>)',
          '600': 'hsla(var(--irmin-blue-600) / <alpha-value>)',
          '700': 'hsla(var(--irmin-blue-700) / <alpha-value>)',
          '800': 'hsla(var(--irmin-blue-800) / <alpha-value>)',
          '900': 'hsla(var(--irmin-blue-900) / <alpha-value>)',
          DEFAULT: 'hsla(var(--irmin-blue-500) / <alpha-value>)',
        },
        irmin_teal: {
          '100': 'hsla(var(--irmin-teal-100) / <alpha-value>)',
          '200': 'hsla(var(--irmin-teal-200) / <alpha-value>)',
          '300': 'hsla(var(--irmin-teal-300) / <alpha-value>)',
          '400': 'hsla(var(--irmin-teal-400) / <alpha-value>)',
          '500': 'hsla(var(--irmin-teal-500) / <alpha-value>)',
          '600': 'hsla(var(--irmin-teal-600) / <alpha-value>)',
          '700': 'hsla(var(--irmin-teal-700) / <alpha-value>)',
          '800': 'hsla(var(--irmin-teal-800) / <alpha-value>)',
          '900': 'hsla(var(--irmin-teal-900) / <alpha-value>)',
          DEFAULT: 'hsla(var(--irmin-teal-500) / <alpha-value>)',
        },
        irmin_green: {
          '100': 'hsla(var(--irmin-green-100) / <alpha-value>)',
          '200': 'hsla(var(--irmin-green-200) / <alpha-value>)',
          '300': 'hsla(var(--irmin-green-300) / <alpha-value>)',
          '400': 'hsla(var(--irmin-green-400) / <alpha-value>)',
          '500': 'hsla(var(--irmin-green-500) / <alpha-value>)',
          '600': 'hsla(var(--irmin-green-600) / <alpha-value>)',
          '700': 'hsla(var(--irmin-green-700) / <alpha-value>)',
          '800': 'hsla(var(--irmin-green-800) / <alpha-value>)',
          '900': 'hsla(var(--irmin-green-900) / <alpha-value>)',
          DEFAULT: 'hsla(var(--irmin-green-500) / <alpha-value>)',
        },
        background: 'hsla(var(--background) / <alpha-value>)',
        foreground: 'hsla(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsla(var(--card) / <alpha-value>)',
          foreground: 'hsla(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsla(var(--popover) / <alpha-value>)',
          foreground: 'hsla(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsla(var(--primary) / <alpha-value>)',
          foreground: 'hsla(var(--primary-foreground) / <alpha-value>)',
        },
        alternative: {
          DEFAULT: 'hsla(var(--alternative) / <alpha-value>)',
          foreground: 'hsla(var(--alternative-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsla(var(--secondary) / <alpha-value>)',
          foreground: 'hsla(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsla(var(--muted) / <alpha-value>)',
          foreground: 'hsla(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsla(var(--accent) / <alpha-value>)',
          foreground: 'hsla(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsla(var(--destructive) / <alpha-value>)',
          foreground: 'hsla(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'hsla(var(--border) / <alpha-value>)',
        input: 'hsla(var(--input) / <alpha-value>)',
        ring: 'hsla(var(--ring) / <alpha-value>)',
        chart: {
          '1': 'hsla(var(--chart-1) / <alpha-value>)',
          '2': 'hsla(var(--chart-2) / <alpha-value>)',
          '3': 'hsla(var(--chart-3) / <alpha-value>)',
          '4': 'hsla(var(--chart-4) / <alpha-value>)',
          '5': 'hsla(var(--chart-5) / <alpha-value>)',
        },
      },
      keyframes: {
        slideInUp: {
          '0%': {
            transform: 'translateY(100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        fadeIn: {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        slideIn: {
          '0%': {
            transform: 'translateX(100%)',
          },
          '100%': {
            transform: 'translateX(0)',
          },
        },
        slideOut: {
          '0%': {
            transform: 'translateX(0)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      },
      animation: {
        slideInUp: 'slideInUp 0.2s ease-out',
        fadeIn: 'fadeIn 0.2s ease-in-out',
        slideIn: 'slideIn 0.2s ease-out forwards',
        slideOut: 'slideOut 0.2s ease-out forwards',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
