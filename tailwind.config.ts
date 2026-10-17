import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Graphite with a cool tint: darker and less saturated than before, so
        // the brand gradients and green/red P&L do the talking.
        ink: {
          950: "rgb(7 8 13 / <alpha-value>)",
          900: "rgb(15 18 27 / <alpha-value>)",
          800: "rgb(26 30 43 / <alpha-value>)",
          700: "rgb(38 43 60 / <alpha-value>)",
          600: "rgb(55 62 84 / <alpha-value>)",
          500: "rgb(110 118 145 / <alpha-value>)",
          400: "rgb(146 154 179 / <alpha-value>)",
          300: "rgb(181 188 207 / <alpha-value>)",
          200: "rgb(214 218 230 / <alpha-value>)",
          100: "rgb(238 240 246 / <alpha-value>)",
          50: "rgb(247 248 251 / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 18px 40px -24px rgba(0,0,0,0.85)",
        "glow-rose": "0 10px 30px -10px rgba(244,63,94,0.65)",
        "glow-emerald": "0 10px 30px -10px rgba(16,185,129,0.65)",
        "glow-violet": "0 10px 30px -10px rgba(139,92,246,0.65)",
      },
      backgroundImage: {
        brand: "linear-gradient(135deg, #fb7185 0%, #e879f9 50%, #8b5cf6 100%)",
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
