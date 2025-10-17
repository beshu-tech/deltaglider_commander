/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Typography Scale - Professional design system
      fontSize: {
        // Titles: 20-24px, weight 600-700
        title: ["1.5rem", { lineHeight: "1.3", fontWeight: "700", letterSpacing: "-0.01em" }], // 24px
        "title-sm": ["1.25rem", { lineHeight: "1.4", fontWeight: "600", letterSpacing: "-0.01em" }], // 20px

        // Section headers: 16-18px, weight 500
        section: ["1.125rem", { lineHeight: "1.5", fontWeight: "500" }], // 18px
        "section-sm": ["1rem", { lineHeight: "1.5", fontWeight: "500" }], // 16px

        // Body: 14-15px, weight 400, line-height 1.5-1.6
        body: ["0.9375rem", { lineHeight: "1.6", fontWeight: "400" }], // 15px
        "body-sm": ["0.875rem", { lineHeight: "1.6", fontWeight: "400" }], // 14px

        // Labels: 12-13px, weight 500
        label: ["0.8125rem", { lineHeight: "1.5", fontWeight: "500" }], // 13px
        "label-sm": ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }], // 12px
      },

      // Semantic Spacing Scale - 8-16-32 rule
      spacing: {
        section: "2rem", // 32px - Between major sections
        block: "1.5rem", // 24px - Between content blocks
        group: "1rem", // 16px - Between related elements
        item: "0.75rem", // 12px - Between list items
        inline: "0.5rem", // 8px - Inline spacing
      },

      // 5 Functional Color Tones - 2025 Modern Aesthetic (Light + Dark Mode)
      colors: {
        // Brand/Accent - Primary interactive color (cyan-blue)
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

        // Primary Action - Burgundy/Rose gradient for primary buttons and accents
        primary: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
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

        // Legacy surface colors for backward compatibility
        surface: {
          base: "#F7F8FA",
          elevated: "#FFFFFF",
          subtle: "#F1F3F5",
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

        // Icon shadows for stat cards
        "icon-purple": "0 14px 36px rgba(147, 51, 234, 0.28)", // purple-500
        "icon-emerald": "0 14px 36px rgba(16, 185, 129, 0.28)", // emerald-500
      },

      // Drop shadows for text elements
      dropShadow: {
        "text-light": "0 1px 2px rgba(255, 255, 255, 0.35)",
        "text-dark": "0 1px 4px rgba(8, 15, 35, 0.45)",
        "value-light": "0 4px 12px rgba(15, 23, 42, 0.22)",
        "value-dark": "0 4px 12px rgba(0, 0, 0, 0.4)",
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

      // Custom gradient backgrounds for stat cards
      backgroundImage: {
        // Water gradients (using primary colors)
        "water-light": "linear-gradient(180deg, rgb(76 5 25 / 0.3) 0%, rgb(63 7 19 / 0.3) 100%)", // primary-900/950 at 50% opacity
        "water-dark":
          "linear-gradient(180deg, rgb(136 19 55 / 0.225) 0%, rgb(76 5 25 / 0.225) 100%)", // primary-800/900 at 45% opacity

        // Air gradients (subtle primary tones)
        "air-light":
          "linear-gradient(180deg, rgb(255 241 242 / 0.48) 0%, rgb(255 228 230 / 0.28) 100%)", // primary-50/100
        "air-dark": "linear-gradient(180deg, rgb(76 5 25 / 0.08) 0%, rgb(63 7 19 / 0.06) 100%)", // primary-900/950

        // Gloss effects
        "gloss-primary-light":
          "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0) 100%)",
        "gloss-primary-dark":
          "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 55%, rgba(255,255,255,0) 100%)",
        "gloss-secondary-light":
          "linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.1) 55%, rgba(255,255,255,0) 100%)",
        "gloss-secondary-dark":
          "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.07) 55%, rgba(255,255,255,0) 100%)",

        // Water line highlight
        "water-line":
          "linear-gradient(90deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.75) 100%)",
      },
    },
  },
  plugins: [],
};
