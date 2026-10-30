import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0d0f1a",
          900: "#13162a",
          800: "#1c2038",
          700: "#252a47",
          600: "#343b5e",
          400: "#7b86b5",
          300: "#a0a9cc",
          200: "#c5cae0",
          100: "#e8eaf4",
          50:  "#f4f5fa",
        },
      },
    },
  },
  plugins: [],
};
export default config;
