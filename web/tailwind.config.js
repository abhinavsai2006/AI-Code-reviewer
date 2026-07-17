/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces
        "background":                "#0A0A0F",
        "surface":                   "#131318",
        "surface-container":         "#111118",
        "surface-container-low":     "#1b1b20",
        "surface-container-high":    "#2a292f",
        "surface-container-highest": "#35343a",
        "surface-container-lowest":  "#0e0e13",
        "surface-variant":           "#35343a",
        "surface-bright":            "#1a1a24",
        // Brand
        "primary":                   "#d2bbff",
        "primary-container":         "#7c3aed",
        "primary-fixed-dim":         "#b89dff",
        "inverse-primary":           "#6b2dd4",
        "on-primary-container":      "#ffffff",
        "secondary":                 "#5de6ff",
        "on-secondary":              "#003540",
        "tertiary":                  "#ffb2b7",
        // Text / surfaces
        "on-surface":                "#e4e1e9",
        "on-surface-variant":        "#cac4d0",
        "outline":                   "#958da1",
        "outline-glass":             "rgba(255,255,255,0.08)",
        "outline-variant":           "#4a4455",
        // Status
        "success":                   "#10B981",
        "warning":                   "#F59E0B",
        "critical":                  "#EF4444",
        // Extra
        "surface-overlay":           "rgba(18,18,26,0.65)",
      },
      borderRadius: {
        "DEFAULT": "6px",
        "sm":  "4px",
        "md":  "8px",
        "lg":  "10px",
        "xl":  "12px",
        "2xl": "16px",
        "3xl": "24px",
        "full": "9999px",
      },
      fontFamily: {
        "mono-code": ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
        "sans":      ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "mono-code":    ["13px", { lineHeight: "1.5",  fontWeight: "400" }],
        "headline-md":  ["22px", { lineHeight: "1.3",  letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg":  ["32px", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-hero": ["64px", { lineHeight: "1.15", letterSpacing: "-0.03em", fontWeight: "800" }],
        "body-sm":      ["14px", { lineHeight: "1.5",  fontWeight: "400" }],
        "body-lg":      ["16px", { lineHeight: "1.6",  fontWeight: "400" }],
        "label-caps":   ["12px", { lineHeight: "1",    letterSpacing: "0.1em",   fontWeight: "600" }],
      },
      spacing: {
        "xs":  "4px",
        "sm":  "8px",
        "md":  "16px",
        "lg":  "24px",
        "xl":  "40px",
        "2xl": "64px",
      },
      boxShadow: {
        "primary-glow":   "0 0 15px rgba(124,58,237,0.3)",
        "primary-glow-lg":"0 0 30px rgba(124,58,237,0.5)",
        "secondary-glow": "0 0 15px rgba(93,230,255,0.3)",
        "glass":          "0 20px 40px rgba(0,0,0,0.4)",
      },
      backgroundImage: {
        "glass-gradient":  "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)",
        "primary-mesh":    "radial-gradient(at 0% 0%, hsla(262,83%,58%,1) 0, transparent 50%), radial-gradient(at 100% 100%, hsla(190,95%,47%,0.3) 0, transparent 50%)",
        "gradient-primary":"linear-gradient(135deg, #7c3aed 0%, #5de6ff 100%)",
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "pulse-slow": "pulse 4s ease-in-out infinite",
      },
      maxWidth: {
        "container-max": "1280px",
      }
    },
  },
  plugins: [],
};
