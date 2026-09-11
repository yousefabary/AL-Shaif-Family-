import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // points at `vercel dev` (run from the repo root), which serves the /api
      // serverless functions locally on port 3000 by default.
      "/api": "http://localhost:3000",
    },
  },
});
