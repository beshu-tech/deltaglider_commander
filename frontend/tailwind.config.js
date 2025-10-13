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
        // Brand/Accent - Primary interactive color
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

        // Semantic tones for light/dark mode consistency
        ui: {
          // Background - Main application background
          bg: "#F7F8FA", // Light mode
          "bg-dark": "#0f172a", // Dark mode (slate-950)

          // Surface - Elevated cards and panels
          surface: "#FFFFFF", // Light mode
          "surface-dark": "#1e293b", // Dark mode (slate-900)

          // Border - Dividers and outlines
          border: "#e2e8f0", // Light mode (slate-200)
          "border-dark": "#334155", // Dark mode (slate-700)

          // Text Primary - Main content text
          text: "#0f172a", // Light mode (slate-900)
          "text-dark": "#f1f5f9", // Dark mode (slate-100)

          // Text Secondary - Supporting text
          "text-muted": "#64748b", // Light mode (slate-500)
          "text-muted-dark": "#94a3b8", // Dark mode (slate-400)
        },

        // Legacy surface colors for backward compatibility
        surface: {
          base: "#F7F8FA",
          elevated: "#FFFFFF",
          subtle: "#F1F3F5",
        },
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
