import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Category accent colors — reused by bars, dials, chips.
        trust: "#6366f1",
        content: "#0ea5e9",
        pricing: "#10b981",
        seo: "#f59e0b",
        catalog: "#ec4899",
      },
    },
  },
  plugins: [],
};

export default config;
