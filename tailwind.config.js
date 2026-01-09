/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    screens: {
      xs: { max: '479px' },
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1440px',
    },
    extend: {
      colors: {
        bg: '#060608',
        panel: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.18)',
        borderStrong: 'rgba(255,255,255,0.28)',
        textPrimary: 'rgba(255, 255, 255, 0.62)',
        textSecondary: 'rgba(255,255,255,0.45)',
        accent: '#C9A86A',
        screen: '#0B0C0F',
      },
    },
  },
  plugins: [],
};

