/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // 5 Functional Color Tones - 2025 Modern Aesthetic (Light + Dark Mode)
      colors: {
        // Primary Action - Burgundy/Maroon for primary buttons and accents
        primary: {
          50: "#fef2f3",
          100: "#fde6e8",
          200: "#fad0d5",
          300: "#f4a9b2",
          400: "#ec7a8a",
          500: "#df4f64",
          600: "#be123c",
          700: "#9f1239",
          800: "#881337",
          900: "#4c0519",
          950: "#3f0713",
        },

        // Semantic tones for light/dark mode consistency
        ui: {
          // Background - Main application background
          bg: "#F5F6F8", // Light mode (toned down from #F7F8FA)
          "bg-dark": "#1E1F22", // Dark mode (neutral brownish-gray)

          // Background subtle - Slightly different background (for zebra striping)
          "bg-subtle": "#F7F8FA", // Light mode (very subtle zebra stripe)
          "bg-subtle-dark": "#2D2E31", // Dark mode (barely lighter than surface-dark for subtle zebra)

          // Surface - Elevated cards and panels
          surface: "#FAFBFC", // Light mode (toned down from #FFFFFF pure white)
          "surface-dark": "#2B2D30", // Dark mode (slightly lighter than neutral-dark)

          // Surface hover states
          "surface-hover": "#F0F2F5", // Light mode (toned down from #f8fafc)
          "surface-hover-dark": "#374151", // Dark mode (gray-700)

          // Surface active/pressed states
          "surface-active": "#E8EBF0", // Light mode (toned down from #f1f5f9)
          "surface-active-dark": "#1f2937", // Dark mode (gray-800)

          // Border - Dividers and outlines
          border: "#D8DCE3", // Light mode (toned down from #e2e8f0)
          "border-dark": "#334155", // Dark mode (slate-700)

          // Border subtle
          "border-subtle": "#E8EBF0", // Light mode (toned down from #f1f5f9)
          "border-subtle-dark": "#1e293b", // Dark mode (slate-800)

          // Border hover
          "border-hover": "#B8BFC8", // Light mode (toned down from #cbd5e1)
          "border-hover-dark": "#475569", // Dark mode (slate-600)

          // Text Primary - Main content text
          text: "#0f172a", // Light mode (slate-900)
          "text-dark": "#f1f5f9", // Dark mode (slate-100)

          // Text Secondary - Supporting text
          "text-muted": "#64748b", // Light mode (slate-500)
          "text-muted-dark": "#94a3b8", // Dark mode (slate-400)

          // Text Tertiary - Less prominent text
          "text-subtle": "#94a3b8", // Light mode (slate-400)
          "text-subtle-dark": "#64748b", // Dark mode (slate-500)

          // Icon colors
          icon: "#64748b", // Light mode (slate-500)
          "icon-dark": "#94a3b8", // Dark mode (slate-400)

          // Icon subtle
          "icon-subtle": "#cbd5e1", // Light mode (slate-300)
          "icon-subtle-dark": "#475569", // Dark mode (slate-600)
        },

        // Neutral dark background for sidebar
        "neutral-dark": "#1E1F22",
      },

      // Layered Elevation System - Subtle shadows for depth
      boxShadow: {
        // Light mode - subtle dark shadows
        "elevation-sm": "0 1px 2px rgba(0, 0, 0, 0.04)",
        "elevation-md": "0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
        "elevation-lg": "0 4px 16px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.03)",

        // Dark mode - lighter backgrounds + subtle glow
        "elevation-sm-dark": "0 1px 2px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03)",
        "elevation-md-dark": "0 2px 8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        "elevation-lg-dark": "0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.07)",
      },

      // Motion System - Subtle transitions (100-150ms)
      transitionDuration: {
        fast: "100ms", // Quick feedback (hover, focus)
        base: "150ms", // Standard transitions (modals, dropdowns)
        slow: "200ms", // Slower animations (page transitions)
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)", // ease-in-out equivalent
      },

      // Accessible Focus States - 2px solid, 3:1 contrast
      outlineWidth: {
        focus: "2px",
      },
      outlineOffset: {
        focus: "2px",
      },
      ringWidth: {
        focus: "3px",
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
