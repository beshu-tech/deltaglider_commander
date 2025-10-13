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

      // Color System - Soft neutral backgrounds
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
        surface: {
          base: "#F7F8FA", // Soft neutral gray for main background
          elevated: "#FFFFFF", // White for cards and elevated surfaces
          subtle: "#F1F3F5", // Subtle background for nested content
        },
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
