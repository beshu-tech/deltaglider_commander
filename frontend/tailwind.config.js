/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2fbff",
          100: "#e6f5ff",
          200: "#bfebff",
          300: "#80d9ff",
          400: "#33c2ff",
          500: "#00a7f0",
          600: "#0085c7",
          700: "#0069a1",
          800: "#005584",
          900: "#003a5c",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
