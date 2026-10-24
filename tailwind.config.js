import { heroui } from "@heroui/theme";

export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ["Arial", "Noto Sans KR", "sans-serif"],
        mono: ["d2coding", "monospace"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: "#f4f3ef",
            foreground: "#293630",
            primary: { DEFAULT: "#386553", foreground: "#ffffff" },
          },
        },
        dark: {
          colors: {
            background: "#171e1b",
            foreground: "#e3e9e4",
            primary: { DEFAULT: "#a7c9b1", foreground: "#17251d" },
          },
        },
      },
    }),
  ],
};
