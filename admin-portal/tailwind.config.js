/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '1.25rem',
      screens: { '2xl': '1400px' }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        cream: {
          DEFAULT: '#FFF3C1',
          50: '#FFFAE2',
          100: '#FFF6D2',
          200: '#FFF3C1',
          300: '#F5E5A1',
          400: '#E8D478',
          500: '#D4BD55',
          600: '#A89538',
          700: '#7A6B22',
          800: '#4D4214',
          900: '#2A240A'
        },
        ivory: { DEFAULT: '#FFF3C1', 50: '#FFFAE2', 100: '#FFF6D2', 200: '#FFF3C1' },
        saffron: {
          DEFAULT: '#FF6B00',
          50: '#FFF4E6', 100: '#FFE4C2', 200: '#FFCC85',
          300: '#FFB347', 400: '#FF9522', 500: '#FF6B00',
          600: '#E55A00', 700: '#B84600', 800: '#8C3500', 900: '#5C2200'
        },
        gold: {
          DEFAULT: '#D4AF37',
          50: '#FBF6E5', 100: '#F5E9B8', 200: '#EDD683',
          300: '#E2C24E', 400: '#D4AF37', 500: '#B8932A',
          600: '#937420', 700: '#6F5618', 800: '#4D3B0F', 900: '#2E2308'
        },
        maroon: {
          DEFAULT: '#800020',
          50: '#FCE9EC', 100: '#F4BFC7', 200: '#E687A0',
          300: '#D45878', 400: '#B83A5C', 500: '#800020',
          600: '#660019', 700: '#4D0013', 800: '#33000C', 900: '#1A0006'
        },
        midnight: { DEFAULT: '#0D0D0D', 800: '#1A1A1A' },
        burgundy: '#6B1024',
      },
      fontFamily: {
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
}
