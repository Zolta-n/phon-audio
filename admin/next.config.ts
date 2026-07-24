import type { NextConfig } from "next";
import * as path from "node:path";

const nextConfig: NextConfig = {
  // Dev-mode access comes through Codespaces forwarding or a cloudflared
  // quick tunnel — allow those origins or the login form loads without JS.
  allowedDevOrigins: ["127.0.0.1", "*.app.github.dev", "*.trycloudflare.com"],
  // The admin app imports shared modules from ../web/lib and ../src, so the
  // tracing/bundling root is the repo root, not admin/.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
