import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: "#FAF7F2", deep: "#F1EADF" },
        // deep : pour le petit texte, #D95D39 n'atteint que 3,5:1 sur le crème
        terracotta: { DEFAULT: "#D95D39", deep: "#B8452A" },
        sage: { DEFAULT: "#606C38", light: "#839788" },
        espresso: "#282624",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      keyframes: {
        alarm: { "50%": { backgroundColor: "#D95D39", color: "#FFFFFF" } },
      },
      animation: { alarm: "alarm 0.8s steps(1) infinite" },
    },
  },
} satisfies Config;
