// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Tailwind v4 is wired through its Vite plugin — no tailwind.config.js needed.
// All design tokens live in src/styles/global.css under @theme.
export default defineConfig({
  site: "https://cuenca.example.com",
  vite: {
    plugins: [tailwindcss()],
  },
});
