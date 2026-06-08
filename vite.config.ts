import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { registerApiRoutes } from "./server/api";

export default defineConfig({
  base: "/k-market-radar/",
  plugins: [
    react(),
    {
      name: "market-cycle-radar-api",
      configureServer(server) {
        registerApiRoutes(server);
      }
    }
  ],
  server: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    allowedHosts: [
      ".trycloudflare.com"
    ]
  }
});