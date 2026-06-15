/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Backgrounds — driven by CSS variables so they swap with the theme.
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        card: 'rgb(var(--c-card) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        bordersoft: 'rgb(var(--c-fg) / 0.07)',
        // Brand
        amber: 'rgb(var(--c-amber) / <alpha-value>)',
        amberlight: 'rgb(var(--c-amber-light) / <alpha-value>)',
        amberdim: 'rgb(var(--c-amber) / 0.14)',
        // Semantic
        teal: 'rgb(var(--c-teal) / <alpha-value>)',
        coral: 'rgb(var(--c-coral) / <alpha-value>)',
        purple: 'rgb(var(--c-purple) / <alpha-value>)',
        green: 'rgb(var(--c-green) / <alpha-value>)',
        indigo: 'rgb(var(--c-indigo) / <alpha-value>)',
        // Text
        ink: 'rgb(var(--c-fg) / <alpha-value>)',
        sub: 'rgb(var(--c-sub) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
      },
      fontSize: {
        xs: '11px',
        sm: '13px',
        base: '15px',
        md: '17px',
        lg: '20px',
        xl: '24px',
        '2xl': '30px',
        '3xl': '38px',
      },
      letterSpacing: {
        tight: '-0.4px',
        tighter: '-0.8px',
      },
      borderRadius: {
        card: '22px',
        pill: '100px',
        modal: '28px',
        bubble: '26px',
      },
    },
  },
  plugins: [],
};
