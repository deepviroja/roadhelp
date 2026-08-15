import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["firebase/app", "firebase/firestore", "firebase/auth", "firebase/database"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) return 'firebase-vendor';
          if (id.includes('leaflet')) return 'leaflet-vendor';
          if (id.includes('framer-motion')) return 'motion-vendor';
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'forms-vendor';
          if (id.includes('lucide-react')) return 'icons-vendor';
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
