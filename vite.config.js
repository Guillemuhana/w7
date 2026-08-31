import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En produccion el bundle se publica sin sourcemaps, sin comentarios y sin
// logs: es lo unico que el navegador se lleva, asi que no debe filtrar
// nombres de archivos, rutas internas ni trazas de desarrollo.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    sourcemap: false,
    minify: "esbuild",
    reportCompressedSize: false,
  },
  esbuild: {
    legalComments: "none",
    ...(mode === "production" ? { drop: ["console", "debugger"] } : {}),
  },
}));
