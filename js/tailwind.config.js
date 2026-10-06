tailwind.config = {
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        ink:    { DEFAULT: '#16110d', soft: '#2a211a', muted: '#6b5d52' },
        cream:  { DEFAULT: '#faf6ef', dark: '#f1e9dc' },
        brand:  { 50: '#fff8eb', 100: '#feecc7', 200: '#fdd88a', 300: '#fcc24d',
                  400: '#fbb13c', 500: '#f59e0b', 600: '#e07b06', 700: '#b95a08', 800: '#96460e' },
      },
      boxShadow: {
        card:  '0 1px 1px rgba(22,17,13,.04), 0 2px 6px rgba(22,17,13,.05), 0 10px 24px -12px rgba(22,17,13,.14)',
        lift:  '0 2px 4px rgba(22,17,13,.05), 0 12px 28px -10px rgba(22,17,13,.22)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.7)',
      },
      borderRadius: { '4xl': '1.75rem' },
    },
  },
};
