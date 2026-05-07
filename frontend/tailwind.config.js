/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: 'hsl(142, 76%, 20%)',
          foreground: 'hsl(0, 0%, 100%)',
          primary: 'hsl(142, 76%, 25%)',
          'primary-foreground': 'hsl(0, 0%, 100%)',
          accent: 'hsl(142, 76%, 30%)',
          'accent-foreground': 'hsl(0, 0%, 100%)',
          border: 'hsl(142, 76%, 35%)',
          ring: 'hsl(142, 76%, 40%)',
        },
      },
    },
  },
  plugins: [],
};
