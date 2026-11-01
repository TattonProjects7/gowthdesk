import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Deep navy, matching the logo tile: dark enough that the red
        // brand accent and green/red P&L do the talking.
        ink: {
          950: "rgb(5 11 26 / <alpha-value>)",
          900: "rgb(10 20 42 / <alpha-value>)",
          800: "rgb(19 32 61 / <alpha-value>)",
          700: "rgb(30 46 83 / <alpha-value>)",
          600: "rgb(47 65 108 / <alpha-value>)",
          500: "rgb(101 118 158 / <alpha-value>)",
          400: "rgb(143 158 192 / <alpha-value>)",
          300: "rgb(181 193 219 / <alpha-value>)",
          200: "rgb(214 222 238 / <alpha-value>)",
          100: "rgb(238 242 249 / <alpha-value>)",
          50: "rgb(247 249 253 / <alpha-value>)",
        },
      },
      fontFamily: {
        // Sora Bold, used only for the "Shortlist" wordmark next to the logo.
        brand: ["var(--font-brand)", "var(--font-geist-sans)", "sans-serif"],
        sans: ["var(--font-geist-sans)", "-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 18px 40px -24px rgba(0,0,0,0.85)",
        "glow-rose": "0 10px 30px -10px rgba(255,59,59,0.6)",
        "glow-emerald": "0 10px 30px -10px rgba(16,185,129,0.65)",
        "glow-violet": "0 10px 30px -10px rgba(37,99,235,0.65)",
      },
      backgroundImage: {
        // The logo's red arrow: primary buttons and highlights.
        brand: "linear-gradient(135deg, #ff6259 0%, #ff3b3b 50%, #e5173f 100%)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        "gradient-x": { "0%, 100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: {
        "fade-up": "fade-up 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        shimmer: "shimmer 2.2s linear infinite",
        float: "float 6s ease-in-out infinite",
        "gradient-x": "gradient-x 8s ease infinite",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
