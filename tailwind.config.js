/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        'accent-soft': 'var(--accent-soft)',
        'accent-ring': 'var(--accent-ring)',
        'accent-glow': 'var(--accent-glow)',
      },
    },
  },
  plugins: [],
};
