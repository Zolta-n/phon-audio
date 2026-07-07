import type { NextConfig } from "next";
import * as path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // The admin app imports shared modules from ../web/lib and ../src, so the
  // tracing/bundling root is the repo root, not admin/.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
