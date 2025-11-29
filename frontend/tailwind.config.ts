import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        night: "#0B0C10",
        ink: "#121826",
        mint: "#24FFC3",
        sky: "#7AD7F0",
        slate: "#9BA3AF",
        border: "rgba(255,255,255,0.08)",
        panel: "rgba(255,255,255,0.04)"
      },
      boxShadow: {
        glow: "0 10px 40px rgba(36,255,195,0.25)"
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
