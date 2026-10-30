/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: 'rgb(var(--brand-purple) / <alpha-value>)',
          pink: 'rgb(var(--brand-pink) / <alpha-value>)',
          orange: 'rgb(var(--brand-orange) / <alpha-value>)',
          indigo: 'rgb(var(--brand-indigo) / <alpha-value>)',
          'purple-light': 'rgb(var(--brand-purple-light) / <alpha-value>)',
          'pink-light': 'rgb(var(--brand-pink-light) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          dark: 'rgb(var(--success-dark) / <alpha-value>)',
          light: 'rgb(var(--success-light) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          dark: 'rgb(var(--danger-dark) / <alpha-value>)',
          light: 'rgb(var(--danger-light) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
