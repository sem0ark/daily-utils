import { defineConfig } from "vite";
import { viteStaticCopy } from 'vite-plugin-static-copy';
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";



export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "public/cmaps",
          dest: "",
        }
      ]
    })
  ],
  base: "/daily-utils",
});
