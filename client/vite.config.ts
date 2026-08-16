import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode !== "test" && tailwindcss(),
  ].filter(Boolean),
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-firebase-auth": [
            "firebase/app",
            "firebase/auth",
            "firebase/storage",
          ],
          "vendor-firebase-firestore": ["firebase/firestore"],
          "vendor-ui": [
            "lucide-react",
            "framer-motion",
            "@radix-ui/react-progress",
            "@radix-ui/react-slot",
            "@radix-ui/react-tabs",
          ],
          "vendor-utils": ["axios", "clsx", "tailwind-merge", "sonner"],
        },
      },
    },
  },
  esbuild: {
    target: "esnext",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
  },
}));
