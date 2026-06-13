import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { registerApiRoutes } from "./server/api";

const isGithubPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  base: isGithubPages ? "/k-market-radar/" : "/",
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
