import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/features/landing/**/*.{ts,tsx}", "./src/pages/index.tsx"],
  important: ".landing-page",
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        paper: "#F6F1EA",
        paperDeep: "#F5F0E8",
        ink: "#171411",
        muted: "#5F5A54",
        line: "#DED5C9",
        copper: "#C75F43",
        copperSoft: "#E5A17D",
        card: "rgba(255, 252, 246, 0.72)",
      },
      fontFamily: {
        sans: [
          "PingFang SC",
          "Noto Sans SC",
          "Microsoft YaHei",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: ["Georgia", "Times New Roman", "serif"],
      },
      boxShadow: {
        paper: "0 24px 70px rgba(23, 20, 17, 0.08)",
        copper: "0 18px 40px rgba(199, 95, 67, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
