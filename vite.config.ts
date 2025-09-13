import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  
  define: {
    'import.meta.env.VITE_NEXT_PUBLIC_RECAPTCHA_SITE_KEY': JSON.stringify(
      process.env.VITE_NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'
    ),
    'import.meta.env.VITE_NEXT_PUBLIC_CONTACT_EMAIL': JSON.stringify(
      process.env.VITE_NEXT_PUBLIC_CONTACT_EMAIL || 'contact@skylabs.dev'
    ),
  },
  
  server: {
    // Disable HMR overlay for runtime errors
    hmr: {
      overlay: false,
    },
    // Watch for changes in the server directory
    watch: {
      usePolling: true,
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
