import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#20251f",
        muted: "#747b70",
        paper: "#f7f8f4",
        line: "#e8ebe4",
        brand: "#315b45",
        "brand-soft": "#eaf1eb"
      },
      boxShadow: {
        soft: "0 12px 36px rgba(31, 47, 34, 0.06)"
      }
    },
  },
  plugins: [],
};
export default config;
