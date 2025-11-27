import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "Noto Sans", "sans-serif", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"],
      },
      colors: {
        // 🎨 Paleta WebPonto - Derivada das cores do logo
        webponto: {
          // Azul (#1D4ED8) - Cor principal
          blue: "#1D4ED8",           // Base do logo
          "blue-50": "#EFF6FF",       // Azul muito claro (backgrounds)
          "blue-100": "#DBEAFE",      // Azul claro (hover states)
          "blue-200": "#BFDBFE",      // Azul claro médio
          "blue-300": "#93C5FD",      // Azul médio
          "blue-400": "#60A5FA",      // Azul médio-escuro
          "blue-500": "#3B82F6",      // Azul vibrante (blue-light)
          "blue-600": "#1D4ED8",      // BASE DO LOGO ⭐
          "blue-700": "#1E40AF",      // Azul escuro (blue-dark)
          "blue-800": "#1E3A8A",      // Azul muito escuro
          "blue-900": "#1E293B",      // Azul quase preto
          
          // Amarelo (#FBBF24) - Cor de destaque
          yellow: "#FBBF24",          // Base do logo
          "yellow-50": "#FFFBEB",     // Amarelo muito claro
          "yellow-100": "#FEF3C7",    // Amarelo claro (backgrounds)
          "yellow-200": "#FDE68A",    // Amarelo claro médio
          "yellow-300": "#FCD34D",    // Amarelo médio (yellow-light)
          "yellow-400": "#FBBF24",    // BASE DO LOGO ⭐
          "yellow-500": "#F59E0B",    // Amarelo escuro (yellow-dark)
          "yellow-600": "#D97706",    // Amarelo mais escuro
          "yellow-700": "#B45309",    // Amarelo muito escuro
          "yellow-800": "#92400E",    // Amarelo dourado escuro
          "yellow-900": "#78350F",    // Amarelo marrom escuro
          
          // Aliases para compatibilidade
          "blue-light": "#3B82F6",
          "blue-dark": "#1E40AF",
          "yellow-light": "#FCD34D",
          "yellow-dark": "#F59E0B",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1D4ED8", // Azul do logo
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#1D4ED8",
          700: "#1E40AF",
          800: "#1E3A8A",
          900: "#1E293B",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#FBBF24", // Amarelo do logo
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
          foreground: "#1E40AF",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "#FBBF24", // Amarelo do logo
          foreground: "#1E40AF",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.9)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "pulse-slow": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "pulse-slow": "pulse-slow 3s infinite ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config;
