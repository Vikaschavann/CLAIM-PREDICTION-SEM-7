/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#0F1B2D',
        'sidebar-hover': '#1a2d47',
        accent: '#0B7A6E',
        'accent-light': '#0d9485',
        'content-bg': '#F3F5F9',
        'card-border': '#E3E8EF',
        'high-risk': '#B42318',
        'high-risk-bg': '#FEF2F2',
        'medium-risk': '#B7791F',
        'medium-risk-bg': '#FFFBEB',
        'low-risk': '#0B7A6E',
        'low-risk-bg': '#F0FDF9',
        'risk-blue': '#1D4ED8',
        'text-primary': '#0F1B2D',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
};
