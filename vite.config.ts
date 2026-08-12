import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

/** Copy Firebase compat builds into public/ so the messaging SW can importScripts under CSP 'self'. */
function copyFirebaseMessagingCompat(): Plugin {
  const files = ["firebase-app-compat.js", "firebase-messaging-compat.js"] as const;

  const sync = () => {
    const destDir = path.resolve(import.meta.dirname, "client/public/vendor");
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of files) {
      const src = path.resolve(import.meta.dirname, "node_modules/firebase", file);
      if (!fs.existsSync(src)) {
        console.warn(`[copy-firebase-messaging-compat] Missing ${src}`);
        continue;
      }
      fs.copyFileSync(src, path.join(destDir, file));
    }
  };

  return {
    name: "copy-firebase-messaging-compat",
    buildStart: sync,
    configureServer() {
      sync();
    },
  };
}

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
  copyFirebaseMessagingCompat(),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://82.112.253.53:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // optional
      },
      '/subs-api': {
        target: 'https://subs.linkst.ar',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/subs-api/, ''),
        secure: true,
      },
      // Proxy IDG/worker requests to ngrok host to avoid CORS in development.
      '/worker': {
        target: process.env.VITE_IDG_API_BASE_URL || 'https://widen-cash-animosity.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/worker/, '/worker'),
      },
    },
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
